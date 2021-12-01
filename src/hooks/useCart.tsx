import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'
import { toast } from 'react-toastify'
import { api } from '../services/api'
import { Product, Stock } from '../types'

interface CartProviderProps {
  children: ReactNode
}

interface UpdateProductAmount {
  productId: number
  amount: number
}

interface CartContextData {
  cart: Product[]
  addProduct: (productId: number) => Promise<void>
  removeProduct: (productId: number) => void
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void
}

const CartContext = createContext<CartContextData>({} as CartContextData)

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart')

    if (storagedCart) {
      return JSON.parse(storagedCart)
    }

    return []
  })

  const prevCarRef = useRef<Array<Product>>()
  useEffect(() => {
    prevCarRef.current = cart
  })
  const cartPreviousValue = prevCarRef.current
  // https://reactjs.org/docs/hooks-faq.html#how-to-get-the-previous-props-or-state

  useEffect(() => {
    if (cartPreviousValue !== cart) {
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(cart))
    }
  }, [cart])

  const addProduct = async (productId: number) => {
    try {
      const {
        data: { amount },
      } = await api.get(`/stock/${productId}`)
      const product = cart.find((item) => item.id === productId)

      if (product) {
        if (product.amount + 1 > amount) {
          toast.error('Quantidade solicitada fora de estoque')
          return
        }

        const updatedCart = cart.map((item) => {
          if (productId === item.id) item.amount++
          return item
        })

        // localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart))
        // // localStorage.setItem foram alterados pela solucao interessante no material de apoio
        setCart(updatedCart)
      } else {
        const { data } = await api.get(`/products/${productId}`)
        const updatedCart = [...cart, { ...data, amount: 1 }]
        setCart(updatedCart)
        // localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart))
      }
    } catch {
      toast.error('Erro na adição do produto')
    }
  }

  const removeProduct = (productId: number) => {
    try {
      const product = cart.find((item) => item.id === productId)
      if (!product) {
        toast.error('Erro na remoção do produto')
        return
        // throw Error() é mais interessante
      }

      // outra forma interessante:
      // const updatedCart = [...cart]
      // updatedCart.splice(indexProdutoRemover, 1)
      const updatedCart = cart.filter((item) => item.id !== productId)
      setCart(updatedCart)
      // localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart))
    } catch {
      toast.error('Erro na remoção do produto')
    }
  }

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) return

      const { data } = await api.get(`/stock/${productId}`)

      const product = cart.find((item) => item.id === productId)

      if (product) {
        if (data.amount < amount) {
          toast.error('Quantidade solicitada fora de estoque')
          return
        }
      }

      const updatedCart = cart.map((item) => {
        if (productId === item.id) item.amount = amount
        return item
      })

      setCart(updatedCart)
      // localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart))
    } catch {
      toast.error('Erro na alteração de quantidade do produto')
    }
  }

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart(): CartContextData {
  const context = useContext(CartContext)

  return context
}

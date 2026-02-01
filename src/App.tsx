import { AuthProvider } from './contexts/AuthContext'
import { TodoList } from './components/TodoList'
import './App.css'

function App() {
  return (
    <AuthProvider>
      <TodoList />
    </AuthProvider>
  )
}

export default App

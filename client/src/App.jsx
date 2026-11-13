import AuthProvider from './context/AuthProvider.jsx'
import AppRouter from './routes/AppRouter.jsx'
import ErrorBoundary from './components/ErrorBoundary/ErrorBoundary.jsx'

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppRouter />
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App

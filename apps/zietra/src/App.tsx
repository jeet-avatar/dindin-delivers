import { BrowserRouter } from 'react-router'
import { NavBar } from './components/NavBar'

export default function App() {
  return (
    <BrowserRouter>
      <NavBar />
      <div style={{ paddingTop: 100, padding: 60, color: 'var(--text)' }}>
        <h1 className="hero-headline">Zietra</h1>
      </div>
    </BrowserRouter>
  )
}

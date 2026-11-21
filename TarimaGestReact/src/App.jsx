
import { useEffect, useState } from 'react'
import './App.css'

const API_URL = 'https://tarimages.somee.com/api'

function App() {
  const [usuario, setUsuario] = useState('')
  const [contrasena, setContrasena] = useState('')
  const [logueado, setLogueado] = useState(false)
  const [productos, setProductos] = useState([])
  const [busqueda, setBusqueda] = useState('')
  const [nombre, setNombre] = useState('')
  const [precio, setPrecio] = useState('')
  const [editando, setEditando] = useState(null)
  const [mensaje, setMensaje] = useState('')
  const [cargando, setCargando] = useState(false)

  async function iniciarSesion(e) {
    e.preventDefault()
    setMensaje('')
    setCargando(true)

    try {
      const respuesta = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario, contrasena })
      })

      if (!respuesta.ok) {
        throw new Error('Usuario o contraseña incorrectos')
      }

      setLogueado(true)
      await cargarProductos()
      setMensaje('¡Bienvenido a TarimaGest!')
    } catch (error) {
      setMensaje(error.message || 'No se pudo conectar con la API')
    } finally {
      setCargando(false)
    }
  }

  async function cargarProductos() {
    try {
      const respuesta = await fetch(`${API_URL}/productos`)
      if (!respuesta.ok) throw new Error('Error al cargar productos')

      const datos = await respuesta.json()
      setProductos(datos)
    } catch (error) {
      setMensaje(error.message)
    }
  }

  async function guardarProducto(e) {
    e.preventDefault()
    setMensaje('')

    if (!nombre.trim() || precio === '' || Number(precio) <= 0) {
      setMensaje('Completa el nombre y escribe un precio mayor que cero.')
      return
    }

    const producto = {
      nombre: nombre.trim(),
      precio: Number(precio)
    }

    const url = editando
      ? `${API_URL}/productos/${editando}`
      : `${API_URL}/productos`

    try {
      const respuesta = await fetch(url, {
        method: editando ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(producto)
      })

      if (!respuesta.ok) throw new Error('No se pudo guardar el producto')

      setMensaje(editando ? 'Producto actualizado correctamente.' : 'Producto registrado correctamente.')
      limpiarFormulario()
      await cargarProductos()
    } catch (error) {
      setMensaje(error.message)
    }
  }

  function prepararEdicion(producto) {
    setEditando(producto.id)
    setNombre(producto.nombre)
    setPrecio(producto.precio)
    setMensaje('')
  }

  async function eliminarProducto(id) {
    const confirmar = window.confirm('¿Estás segura de que deseas eliminar este producto?')

    if (!confirmar) return

    try {
      const respuesta = await fetch(`${API_URL}/productos/${id}`, {
        method: 'DELETE'
      })

      if (!respuesta.ok) throw new Error('No se pudo eliminar el producto')

      setMensaje('Producto eliminado correctamente.')
      await cargarProductos()
    } catch (error) {
      setMensaje(error.message)
    }
  }

  function limpiarFormulario() {
    setNombre('')
    setPrecio('')
    setEditando(null)
  }

  function cerrarSesion() {
    setLogueado(false)
    setUsuario('')
    setContrasena('')
    setProductos([])
    limpiarFormulario()
    setMensaje('')
  }

  const productosFiltrados = productos.filter((producto) =>
    producto.nombre.toLowerCase().includes(busqueda.toLowerCase())
  )

  if (!logueado) {
    return (
      <main className="login-page">
        <form className="login-card" onSubmit={iniciarSesion}>
          <div className="brand-icon">TG</div>
          <h1>TarimaGest</h1>
          <p className="subtitle">Sistema de gestión de productos</p>

          <label>Usuario</label>
          <input
            type="text"
            placeholder="Ingresa tu usuario"
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
            required
          />

          <label>Contraseña</label>
          <input
            type="password"
            placeholder="Ingresa tu contraseña"
            value={contrasena}
            onChange={(e) => setContrasena(e.target.value)}
            required
          />

          <button type="submit" disabled={cargando}>
            {cargando ? 'Ingresando...' : 'Iniciar sesión'}
          </button>

          {mensaje && <p className="message">{mensaje}</p>}
          <small>Acceso al sistema de administración</small>
        </form>
      </main>
    )
  }

  return (
    <main className="dashboard">
      <header className="topbar">
        <div>
          <h1>TarimaGest</h1>
          <p>Administración de productos</p>
        </div>
        <button className="logout-button" onClick={cerrarSesion}>
          Cerrar sesión
        </button>
      </header>

      <section className="content">
        <div className="welcome">
          <h2>Panel de productos</h2>
          <p>Administra los productos registrados en el sistema.</p>
        </div>

        {mensaje && <div className="message dashboard-message">{mensaje}</div>}

        <div className="summary">
          <div className="summary-card">
            <span>Total de productos</span>
            <strong>{productos.length}</strong>
          </div>
        </div>

        <div className="management">
          <section className="form-card">
            <h3>{editando ? 'Editar producto' : 'Registrar producto'}</h3>

            <form onSubmit={guardarProducto}>
              <label>Nombre del producto</label>
              <input
                type="text"
                placeholder="Ej. Teclado"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                required
              />

              <label>Precio (₡)</label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                placeholder="Ej. 12000"
                value={precio}
                onChange={(e) => setPrecio(e.target.value)}
                required
              />

              <button type="submit">
                {editando ? 'Guardar cambios' : 'Agregar producto'}
              </button>

              {editando && (
                <button type="button" className="cancel-button" onClick={limpiarFormulario}>
                  Cancelar edición
                </button>
              )}
            </form>
          </section>

          <section className="table-card">
            <div className="table-heading">
              <h3>Productos registrados</h3>
              <button className="refresh-button" onClick={cargarProductos}>
                Actualizar
              </button>
            </div>

            <input
              className="search-input"
              type="search"
              placeholder="Buscar producto..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />

            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Producto</th>
                    <th>Precio</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {productosFiltrados.map((producto) => (
                    <tr key={producto.id}>
                      <td>{producto.id}</td>
                      <td>{producto.nombre}</td>
                      <td>₡{Number(producto.precio).toLocaleString('es-CR')}</td>
                      <td className="actions">
                        <button className="edit-button" onClick={() => prepararEdicion(producto)}>
                          Editar
                        </button>
                        <button className="delete-button" onClick={() => eliminarProducto(producto.id)}>
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))}

                  {productosFiltrados.length === 0 && (
                    <tr>
                      <td colSpan="4" className="empty">
                        No se encontraron productos.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </section>
    </main>
  )
}

export default App

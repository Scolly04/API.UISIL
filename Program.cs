
using Microsoft.Data.SqlClient;

var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

string ObtenerConexion(IConfiguration config) =>
    config.GetConnectionString("ConexionSQL")
    ?? throw new InvalidOperationException("Falta la conexión ConexionSQL.");


// GET: consultar todos los productos desde SQL Server
app.MapGet("/api/productos", async (IConfiguration config) =>
{
    var productos = new List<Producto>();

    await using var conexion = new SqlConnection(ObtenerConexion(config));
    await conexion.OpenAsync();

    const string sql = "SELECT Id, Nombre, Precio FROM dbo.Productos";
    await using var comando = new SqlCommand(sql, conexion);
    await using var lector = await comando.ExecuteReaderAsync();

    while (await lector.ReadAsync())
    {
        productos.Add(new Producto(
            lector.GetInt32(0),
            lector.GetString(1),
            lector.GetDecimal(2)));
    }

    return Results.Ok(productos);
});


// GET: consultar un producto por ID
app.MapGet("/api/productos/{id:int}", async (int id, IConfiguration config) =>
{
    await using var conexion = new SqlConnection(ObtenerConexion(config));
    await conexion.OpenAsync();

    const string sql = """
        SELECT Id, Nombre, Precio
        FROM dbo.Productos
        WHERE Id = @Id
        """;

    await using var comando = new SqlCommand(sql, conexion);
    comando.Parameters.AddWithValue("@Id", id);

    await using var lector = await comando.ExecuteReaderAsync();

    if (!await lector.ReadAsync())
        return Results.NotFound("Producto no encontrado.");

    var producto = new Producto(
        lector.GetInt32(0),
        lector.GetString(1),
        lector.GetDecimal(2));

    return Results.Ok(producto);
});


// POST: agregar un producto
app.MapPost("/api/productos", async (ProductoRequest nuevo, IConfiguration config) =>
{
    if (string.IsNullOrWhiteSpace(nuevo.Nombre) || nuevo.Precio < 0)
        return Results.BadRequest("Ingrese un nombre y un precio válido.");

    await using var conexion = new SqlConnection(ObtenerConexion(config));
    await conexion.OpenAsync();

    const string sql = """
        INSERT INTO dbo.Productos (Nombre, Precio)
        OUTPUT INSERTED.Id
        VALUES (@Nombre, @Precio)
        """;

    await using var comando = new SqlCommand(sql, conexion);
    comando.Parameters.AddWithValue("@Nombre", nuevo.Nombre);
    comando.Parameters.AddWithValue("@Precio", nuevo.Precio);

    int id = Convert.ToInt32(await comando.ExecuteScalarAsync());

    var producto = new Producto(id, nuevo.Nombre, nuevo.Precio);

    return Results.Created($"/api/productos/{id}", producto);
});


// PUT: actualizar un producto
app.MapPut("/api/productos/{id:int}", async (int id, ProductoRequest actualizado, IConfiguration config) =>
{
    if (string.IsNullOrWhiteSpace(actualizado.Nombre) || actualizado.Precio < 0)
        return Results.BadRequest("Ingrese un nombre y un precio válido.");

    await using var conexion = new SqlConnection(ObtenerConexion(config));
    await conexion.OpenAsync();

    const string sql = """
        UPDATE dbo.Productos
        SET Nombre = @Nombre, Precio = @Precio
        WHERE Id = @Id
        """;

    await using var comando = new SqlCommand(sql, conexion);
    comando.Parameters.AddWithValue("@Id", id);
    comando.Parameters.AddWithValue("@Nombre", actualizado.Nombre);
    comando.Parameters.AddWithValue("@Precio", actualizado.Precio);

    int filas = await comando.ExecuteNonQueryAsync();

    if (filas == 0)
        return Results.NotFound("Producto no encontrado.");

    return Results.Ok(new Producto(id, actualizado.Nombre, actualizado.Precio));
});


// DELETE: eliminar un producto por ID
app.MapDelete("/api/productos/{id:int}", async (int id, IConfiguration config) =>
{
    await using var conexion = new SqlConnection(ObtenerConexion(config));
    await conexion.OpenAsync();

    const string sql = "DELETE FROM dbo.Productos WHERE Id = @Id";

    await using var comando = new SqlCommand(sql, conexion);
    comando.Parameters.AddWithValue("@Id", id);

    int filas = await comando.ExecuteNonQueryAsync();

    return filas == 0
        ? Results.NotFound("Producto no encontrado.")
        : Results.NoContent();
});


// POST: validar credenciales guardadas en SQL Server
app.MapPost("/api/login", async (LoginRequest datos, IConfiguration config) =>
{
    await using var conexion = new SqlConnection(ObtenerConexion(config));
    await conexion.OpenAsync();

    const string sql = """
        SELECT COUNT(*)
        FROM dbo.Usuarios
        WHERE Usuario = @Usuario AND Contrasena = @Contrasena
        """;

    await using var comando = new SqlCommand(sql, conexion);
    comando.Parameters.AddWithValue("@Usuario", datos.Usuario);
    comando.Parameters.AddWithValue("@Contrasena", datos.Contrasena);

    int coincidencias = Convert.ToInt32(await comando.ExecuteScalarAsync());

    return coincidencias > 0
        ? Results.Ok(new { mensaje = "Inicio de sesión correcto." })
        : Results.Unauthorized();
});

app.MapGet("/", () => "API RESTful conectada a SQL Server.");

app.Run();

record Producto(int Id, string Nombre, decimal Precio);
record ProductoRequest(string Nombre, decimal Precio);
record LoginRequest(string Usuario, string Contrasena);

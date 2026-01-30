# Antojitos la Tia - Admin Web

Web de administración privada para Antojitos la Tia, construida con tecnologias modernas para centralizar la gestión de facturas, inventario, ventas y gastos.

## 🚀 Tecnologías

- **Frontend**: Next.js 14+ (App Router), React, TypeScript.
- **Estilos**: Tailwind CSS 4, Framer Motion (animaciones), Lucide React (iconos).
- **Backend**: Firebase (Auth, Firestore, Storage).
- **Herramientas**: `jspdf` (PDF), `xlsx` (Excel).

## 🛠️ Instalación y Configuración

1.  **Instalar dependencias**:
    ```bash
    npm install
    ```

2.  **Configurar Variables de Entorno**:
    El archivo `.env.local` ya ha sido configurado con las credenciales de Firebase del proyecto `antojitos-la-tia-admin-99999`.

3.  **Iniciar Servidor de Desarrollo**:
    ```bash
    npm run dev
    ```
    Visita `http://localhost:3000`.

## ⚙️ Funcionalidades

### 🔐 Autenticación
- Acceso restringido a administradores.
- **Admin por defecto**: `cacoreasa@gmail.com`.
- Para agregar más administradores, crea una colección `admins` en Firestore y añade documentos con el ID igual al email del usuario.

### 🧾 Facturas (Invoices)
- Generación de facturas con productos del inventario.
- Cálculo automático de totales.
- **Estados**:
    - `Pendiente`: Creada pero no pagada.
    - `Pagado`: Se registra automáticamente como **Venta**.
    - `Entregado`: Descuenta automáticamente del **Inventario**.
- **Enlace Público**: Permite compartir la factura con clientes vía URL (vista de solo lectura).
- **PDF**: Descarga profesional de la factura.

### 📦 Inventario
- CRUD de productos (Crear, Leer, Actualizar, Borrar).
- Control de stock y alertas de stock bajo (configurable).

### 💰 Gastos
- Registro de gastos con categoría y fecha.
- **Subida de Recibos**: Adjunta imágenes o PDFs a cada gasto (Firebase Storage).
- **Exportar**: Descarga reporte de gastos en Excel.

### 📈 Ventas
- Historial automático de facturas pagadas.
- Dashboard con métricas clave del mes.
- **Exportar**: Descarga reporte de ventas en Excel.

## 📱 Diseño "Premium"
La interfaz utiliza una paleta de colores basada en el logo (Amarillo, Rojo, Azul) sobre un fondo limpio (Modo Oscuro/Claro), con tarjetas con efectos de vidrio (glassmorphism) y animaciones fluidas.

## 🚀 Despliegue

Este proyecto está listo para ser desplegado en **Vercel** o **Firebase Hosting**.

### Vercel (Recomendado)
1.  Haz push del repositorio a GitHub.
2.  Importa el proyecto en Vercel.
3.  Agrega las variables de entorno de `.env.local` en la configuración del proyecto en Vercel.

### Firebase Hosting
1.  Ejecuta `npm run build`.
2.  Ejecuta `firebase deploy`.

---
Desarrollado por tu Asistente de IA.

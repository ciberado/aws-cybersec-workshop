# Taller de Ciberseguridad en AWS

Una aplicación web completa para la validación y evaluación de configuraciones de ciberseguridad en Amazon Web Services (AWS). Esta plataforma proporciona una interfaz intuitiva para comprobar y calificar ejercicios prácticos de seguridad en la nube.

## 🎯 Características Principales

- **📝 Registro de Estudiantes**: Captura de información académica en formato español (Nombre y Apellidos)
- **🔐 Validación de Credenciales AWS**: Integración en tiempo real con servicios de AWS
- **📊 Panel de Puntuación**: Seguimiento visual del progreso con indicadores dinámicos
- **✅ Validación de Ejercicios**: 9 ejercicios prácticos de ciberseguridad (10 puntos totales)
- **📈 Exportación de Resultados**: Registro automático en CSV con detalles completos
- **🏆 Evaluación Completa**: Sistema de submisión para calificaciones finales

## 🛠️ Tecnologías Utilizadas

- **Frontend**: React 18 + TypeScript + Mantine UI
- **Backend**: Express.js + Node.js + TypeScript  
- **Cloud**: AWS SDK v3 (STS, IAM, S3, EC2, RDS, ELB)
- **Desarrollo**: Vite + Concurrently para desarrollo paralelo
- **🐳 Contenedores**: Docker + Docker Compose para despliegue

## 🚀 Despliegue con Docker

### Usando Docker Compose (Recomendado)
```bash
# Crear archivo de configuración
cp .env-example .env

# Iniciar la aplicación
npm run docker:up
```

### Usando Docker directamente
```bash
# Construir imagen
docker build -t aws-cybersec-workshop .

# Ejecutar con persistencia de datos
docker run --user $(id -u):$(id -g) -p 3002:3002 \
  -v $(pwd)/data:/app/data aws-cybersec-workshop
```

**Acceder a la aplicación:** http://localhost:3002

### 🔧 Resolución de Problemas de Permisos

Si encuentra errores de permisos al escribir archivos CSV:

```bash
# Verificar permisos del directorio de datos
ls -la ./data

# Ajustar permisos para el contenedor (UID 1000)
sudo chown -R 1000:1000 ./data

# Reiniciar el contenedor
docker-compose down && docker-compose up -d
```

**Verificar que funciona:**
```bash
docker-compose exec app touch /app/data/test.txt
```

## 📚 Estructura del Proyecto

```
├── src/
│   ├── client/          # Aplicación React
│   ├── server/          # Servidor Express
│   └── shared/          # Tipos TypeScript compartidos
├── workshop/            # 📖 Instrucciones del taller
│   ├── README.md        # Guía completa del taller
│   ├── userdata.sh      # Script de configuración EC2
│   └── pokemon.csv      # Datos de ejemplo S3
└── data/               # Resultados de evaluaciones (CSV)
```

## 🚀 Instalación y Uso

### Prerrequisitos

- Node.js 18 o superior
- Credenciales AWS válidas
- npm o yarn

### Instalación

```bash
# Clonar el repositorio
git clone <repository-url>
cd aws-cybersec-workshop

# Instalar dependencias
npm install
```

### Desarrollo

```bash
# Iniciar servidores de desarrollo
npm run dev
```

Esto iniciará:
- **Frontend**: http://localhost:5173 (React + Vite)
- **Backend**: http://localhost:3002 (Express API)

### Producción

```bash
# Construir aplicación
npm run build

# Iniciar servidor de producción
npm start
```

## 📖 Instrucciones del Taller

**👉 [Ver instrucciones completas del taller](./workshop/README.md)**

El directorio `workshop/` contiene:
- Guía paso a paso para configurar la infraestructura AWS
- Scripts de automatización y configuración
- Datos de ejemplo y recursos necesarios
- Criterios de evaluación detallados

## 💡 Cómo Usar la Aplicación

### 1. Registro de Estudiante
- Introducir **nombre** y **apellidos** del estudiante
- Proporcionar **credenciales AWS** en formato INI
- La aplicación validará automáticamente la conexión

### 2. Realización de Ejercicios
La aplicación evalúa **9 ejercicios de ciberseguridad**:

1. **Seguridad de Bucket S3 de Datos** (1 punto)
2. **Configuración de Bucket S3 Web** (1 punto)  
3. **Diseño de Red VPC** (1 punto)
4. **Tablas de Rutas de Red** (2 puntos)
5. **Microsegmentación con Grupos de Seguridad** (1 punto)
6. **Protección de Base de Datos RDS** (1 punto)
7. **Application Load Balancer** (1 punto)
8. **Seguridad de Launch Template** (1 punto)
9. **Auto Scaling Group** (1 punto)

### 3. Seguimiento del Progreso
- **Panel de puntuación** con progreso visual en tiempo real
- **Indicadores de color** según el rendimiento (Verde >80%, Amarillo 60-79%, Rojo <60%)
- **Detalles de resultados** expandibles para cada ejercicio

### 4. Submisión de Evaluación
- Botón **"Submit Evaluation"** para enviar resultados finales
- Registro automático en CSV con información completa del estudiante
- Exportación de puntuaciones y estado de cada ejercicio

## 📊 Resultados de Evaluación

Los resultados se guardan en `data/evaluation_results.csv` con:
- **Información del estudiante**: Apellidos, Nombre
- **Detalles de AWS**: ID de cuenta y región
- **Puntuaciones**: Total, máximo y porcentaje de completitud
- **Resultados detallados**: Estado de cada ejercicio individual
- **Timestamp**: Fecha y hora de submisión

## 🔧 API Endpoints

- `GET /api/exercises` - Obtener todos los ejercicios
- `POST /api/exercises/:id/check` - Validar ejercicio específico
- `POST /api/exercises/submit` - Enviar evaluación completa
- `POST /api/credentials/validate` - Validar credenciales AWS
- `GET /api/health` - Estado del servidor

## 🏫 Para Instituciones Educativas

Esta aplicación está diseñada específicamente para:
- **Universidades españolas** con convenciones de nomenclatura local
- **Talleres prácticos** de ciberseguridad en AWS
- **Evaluación automatizada** de competencias en la nube
- **Seguimiento de progreso** de estudiantes en tiempo real
- **Exportación de calificaciones** para sistemas académicos

## 🔒 Seguridad y Privacidad

- ✅ **Datos sensibles** protegidos con `.gitignore`
- ✅ **Credenciales AWS** manejadas de forma segura
- ✅ **Información de estudiantes** almacenada localmente
- ✅ **Acceso concurrente** sin corrupción de datos
- ✅ **Validación en tiempo real** contra servicios AWS

## 📝 Licencia

Este proyecto está diseñado para uso educativo en talleres de ciberseguridad AWS.

## 🤝 Contribución

Para contribuir al proyecto:
1. Fork el repositorio
2. Crear una rama de feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit cambios (`git commit -m 'feat: añadir nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abrir un Pull Request

## 📞 Soporte

Para preguntas sobre el taller o la aplicación, consultar:
- **Documentación técnica**: [APP_DOCUMENTATION.md](./APP_DOCUMENTATION.md)
- **Historial de cambios**: [CHANGELOG.md](./CHANGELOG.md)
- **Instrucciones del taller**: [workshop/README.md](./workshop/README.md)

---

**🎓 Versión 2.0.0** - Plataforma completa de evaluación lista para uso en producción educativa.
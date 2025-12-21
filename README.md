# 🛡️ Workshop de Ciberseguridad en AWS

> **Objetivo:** Evaluar conocimientos de ciberseguridad mediante la implementación de una arquitectura segura en AWS, aplicando principios de defensa en profundidad y mejores prácticas de seguridad en la nube.

## ⚙️ Configuración general

**Restricciones obligatorias** (a menos que se explicite lo contrario):

* **Región:** `us-east-1`
* **Principio de seguridad:** Aplicar siempre el menor privilegio posible
* **Etiquetado:** Todos los recursos deben incluir tags de proyecto y función para trazabilidad

## 🎯 Master and Commander (Configuración de Auditoría)

**Propósito de Seguridad:** Establecer una máquina de auditoría controlada para verificar el cumplimiento de los controles de seguridad implementados. Dentro de unos días te proporcionaré un script que podrás ejecutar en ella y que analizará los elementos que hayas configurado para decirte qué secciones has completado correctamente y qué puntuaciones tienes. Mi idea es que automáticamente me envíe un informe firmado digitalmente que incluya tu número de cuenta, de forma que después pueda cotejar que has completado correctamente el mayor número de pasos posibles. Recuerda: **el script todavía no está disponible**.

**Requisitos:**
* **Instancia:** Ubuntu en la *default VPC*
* **Acceso:** Permisos AWS vía *IAM role* (principio de menor privilegio)
* **Función:** Ejecutar script de verificación de compliance

**Proceso de auditoría:**
1. El script verificará la configuración de seguridad de todos los componentes
2. Generará un informe de cumplimiento firmado criptográficamente
3. Utilizará tu número de cuenta AWS como identificador único
4. Reportará automáticamente los resultados

⚠️ **Nota:** Esta configuración es prerequisito para la evaluación, aunque no tiene puntuación directa.

## 📊 Despliegue del Bucket de Datos (Data Security)

**Propósito de Seguridad:** Implementar almacenamiento seguro con controles de acceso apropiados y principio de menor privilegio.

Crea un bucket de datos con las siguientes **características de seguridad**:

* **Etiquetado:** `proyecto=cybersec`, `funcion=datos`
* **Contenido:** Sube [pokemon.csv](pokemon.csv) a la raíz del bucket
* **Acceso:** Solo mediante credenciales IAM válidas (sin acceso público)
* **Principio aplicado:** Confidencialidad mediante control de acceso

### 📋 Criterios de Evaluación

* **1 punto:** Verificación de acceso controlado - el script validará que:
  - El archivo es accesible **únicamente** con permisos IAM apropiados
  - No existe acceso público no autorizado
  - Los controles de acceso funcionan correctamente

## 🌐 Despliegue del Bucket Web (Public Content Security)

**Propósito de Seguridad:** Configurar hosting web seguro con exposición controlada de contenido público.

Crea un bucket para contenido web con estas **características de seguridad**:

* **Etiquetado:** `proyecto=cybersec`, `funcion=web`
* **Funcionalidad:** Configurado como servidor web estático
* **Contenido:** Archivo `index.html` en la raíz
* **Exposición controlada:** Acceso público solo al contenido web autorizado
* **Principio aplicado:** Disponibilidad con exposición mínima necesaria

### 📋 Criterios de Evaluación

* **1 punto:** Verificación de acceso público controlado:
  - El archivo [index.html](index.html) es accesible vía URL pública
  - La configuración web es correcta y segura
  - No se expone contenido no autorizado


## 🔒 Despliegue de la VPC Principal (Network Security)

**Propósito de Seguridad:** Implementar arquitectura de red defensiva con segmentación por tiers y control de tráfico.

> 💡 **Recomendación:** Configuración manual para reforzar el aprendizaje de seguridad en redes. El wizard de AWS no cubre todos los aspectos de seguridad requeridos.

> 🛠️ **Recursos de apoyo:** [cidr.xyz](https://cidr.xyz/) para planificación CIDR, o consulta con IA para diseño de redes.

**Arquitectura de Seguridad en Capas:**

* **Etiquetado:** `proyecto=cybersec`, `funcion=red`
* **Rango principal:** CIDR /16 (permite crecimiento futuro)
* **Segmentación defensiva en tres tiers:**
  
  🌍 **Tier Público** (DMZ)
  - Acceso directo a internet vía Internet Gateway
  - Para recursos que requieren exposición externa controlada
  - Capacidad: ~256 máquinas por subnet
  
  🔐 **Tier Privado** (Aplicaciones)
  - Acceso a internet solo saliente vía NAT Gateway
  - Para lógica de aplicación sin exposición directa
  - NAT Gateway zonal (alta disponibilidad por AZ)
  - Capacidad: ~256 máquinas por subnet
  
  🛡️ **Tier Interno** (Datos)
  - Sin acceso a internet (máxima protección)
  - Solo comunicación interna entre componentes
  - Capacidad: ~1024 máquinas por subnet

### 📋 Criterios de Evaluación

* **1 punto - Diseño de red:** Verificación de arquitectura CIDR
  - Rangos de VPC y subnets cumplen especificaciones
  - Segmentación correcta entre tiers de seguridad
  
* **2 puntos - Controles de tráfico:** Verificación de tablas de rutas
  - Rutas correctamente asignadas por tier de seguridad
  - Flujo de tráfico sigue principios de defensa en profundidad
  - Aislamiento efectivo entre capas según modelo de amenazas

## 🔥 Firewalls (Microsegmentación de Red)

**Propósito de Seguridad:** Implementar microsegmentación mediante Security Groups aplicando el principio de menor privilegio y comunicación restringida entre capas.

### 🌐 Security Group del Balanceador (`albsg`)
**Función:** Controlar acceso externo (Punto de entrada público)

* **Etiquetado:** `proyecto=cybersec`, `funcion=red`
* **Nombre:** `albsg`
* **Reglas de entrada (mínimo necesario):**
  - Puerto 80 (HTTP) desde 0.0.0.0/0
  - Puerto 443 (HTTPS) desde 0.0.0.0/0
* **Principio:** Exposición controlada solo en puertos web estándar

### 💻 Security Group de Aplicación (`appsg`)
**Función:** Proteger capa de aplicación (Solo desde balanceador)

* **Etiquetado:** `proyecto=cybersec`, `funcion=red`
* **Nombre:** `appsg`
* **Reglas de entrada (microsegmentación):**
  - Puerto 8080 **exclusivamente desde** `albsg`
* **Principio:** Comunicación restringida - solo tráfico autorizado

### 🗄️ Security Group de Base de Datos (`bdsg`)
**Función:** Máxima protección de datos (Solo desde aplicación)

* **Etiquetado:** `proyecto=cybersec`, `funcion=red`
* **Nombre:** `bdsg`
* **Reglas de entrada (defensa en profundidad):**
  - Puerto 5432 (PostgreSQL) **exclusivamente desde** `appsg`
* **Principio:** Acceso a datos solo desde servicios autorizados

### 📋 Criterios de Evaluación

* **1 punto - Microsegmentación efectiva:**
  - Los tres Security Groups existen en la VPC del proyecto
  - Enlazado correcto entre capas (comunicación en cascada)
  - Implementación del principio de menor privilegio
  - Verificación de que no existen reglas excesivamente permisivas

## 🗄️ Base de Datos (Data Protection & High Availability)

**Propósito de Seguridad:** Implementar almacenamiento de datos con máxima protección, alta disponibilidad y principios de confidencialidad.

**Configuración de Seguridad para Datos:**

* **Motor:** PostgreSQL (base de datos empresarial)
* **Aislamiento:** Subnet Group exclusivamente en **subnets internas** (sin acceso directo a internet)
* **Alta Disponibilidad:** 
  - Nodo principal (operaciones normales)
  - Nodo standby (continuidad del negocio)
* **Control de Acceso:** Security Group `bdsg` (acceso restringido)
* **Principios aplicados:** 
  - Confidencialidad (ubicación en tier interno)
  - Disponibilidad (configuración Multi-AZ)
  - Integridad (respaldos automáticos)

### 📋 Criterios de Evaluación

* **1 punto - Protección de datos efectiva:**
  - Base de datos correctamente aislada en tier interno
  - Configuración Multi-AZ para disponibilidad
  - Security Group apropiado aplicado
  - Verificación de que no es accesible desde internet

## ⚖️ Balanceador de Carga (Secure Load Distribution)

**Propósito de Seguridad:** Implementar punto de entrada controlado con distribución segura de tráfico y monitoreo de salud de servicios.

### 🎯 Target Group (`maintg`)
**Función:** Agrupar destinos de aplicación con monitoreo de salud

* **Etiquetado:** `proyecto=cybersec`, `funcion=lb`
* **Nombre:** `maintg`
* **Puerto destino:** 8080 (puerto no estándar para seguridad por oscuridad)
* **Health Check:** Activo con configuración por defecto
* **Principio:** Verificación continua de disponibilidad de servicios

### 🌐 Application Load Balancer (`pokemonlb`)
**Función:** Punto de entrada único y controlado desde internet

* **Etiquetado:** `proyecto=cybersec`, `funcion=lb`
* **Nombre:** `pokemonlb`
* **Protección:** Security Group `albsg` (acceso web controlado)
* **Listener:** Puerto 80 (HTTP) - punto de entrada público
* **Enrutamiento:** Todo el tráfico dirigido a `maintg`
* **Principio:** Centralización de acceso para mejor control y monitoreo

### 📋 Criterios de Evaluación

* **1 punto - Entrada controlada efectiva:**
  - Target Group y ALB cumplen especificación de seguridad
  - Configuración de health checks funciona correctamente
  - Acceso público controlado solo a través del balanceador

## 💻 Capa de Computación (Secure Application Layer)

**Propósito de Seguridad:** Desplegar aplicación en tier privado con acceso controlado a recursos AWS y configuración automática segura.

### 🚀 Launch Template (Plantilla de Seguridad)
**Función:** Definir configuración segura y consistente para instancias

* **Etiquetado:** `proyecto=cybersec`, `funcion=computacion`
* **Base:** AMI Ubuntu (sistema operativo base)
* **Acceso AWS:** IAM Role asignado (principio de menor privilegio)
  - Hipotético uso: descarga segura de `pokemon.csv` desde bucket de datos
* **Configuración:** User data desde [userdata.sh](userdata.sh) (bootstrap automático)
* **Principio:** Configuración inmutable y reproducible

### 📈 Auto Scaling Group (Disponibilidad Controlada)
**Función:** Mantener disponibilidad en tier privado sin exposición directa

* **Base:** Launch Template anterior (herencia de configuración segura)
* **Ubicación:** **Subnets privadas exclusivamente** (no públicas, no internas)
* **Integración:** Auto-registro en Target Group `maintg`
* **Capacidad:** 2 instancias fijas (sin elasticidad para simplicidad)
* **Principio:** Disponibilidad sin exposición directa a internet

### 📋 Criterios de Evaluación

* **1 punto - Configuración segura de instancias:**
  - Launch Template cumple especificación de seguridad
  - IAM Role correctamente asignado con permisos mínimos
  
* **1 punto - Despliegue y funcionamiento seguro:**
  - Auto Scaling Group en subnets privadas únicamente
  - Instancias registradas como healthy en Target Group
  - Comunicación externa solo a través del balanceador
  - Verificación de funcionamiento completo (obtención de pokémon via internet)

---

## 🏆 Resumen de Evaluación

**Total: 10 puntos** distribuidos en verificación de implementación de:
- 🔒 Controles de acceso (buckets S3)
- 🌐 Segmentación de red (VPC y subnets)
- 🔥 Microsegmentación (Security Groups)
- 🗄️ Protección de datos (Base de datos)
- ⚖️ Entrada controlada (Load Balancer)
- 💻 Despliegue seguro (Computación)

**Principios de Ciberseguridad Aplicados:**
- ✅ Defensa en profundidad
- ✅ Principio de menor privilegio
- ✅ Segmentación de red
- ✅ Disponibilidad con seguridad
- ✅ Trazabilidad mediante etiquetado


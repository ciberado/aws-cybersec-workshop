# Cloud workshop de evaluación

## Configuración general

A menos que se explicite lo contrario, sigue las siguientes restricciones:

* Región: `us-east-1`

## Master and Commander

Necesitarás una máquina con Ubuntu en la *default VPC* y con permisos para acceder al API de AWS (a través del *role* correspondiente) para poder ejecutar el script que te pasaré dentro de unos días.

El script es un pequeño programa que comprobará si todo lo que se ha ido pidiendo existe y está configurado según la especificación. A continuación generará un informe, lo firmará usando una clave pública y el número de tu cuenta de AWS y me lo mandará.

Esta sección no tiene puntuación, pero es necesario completarla en algún momento para que puedas determinar cuál es tu nota.

## Despliegue del bucket de datos

Crea un bucket de datos con las siguientes características:

* Tag `proyecto` igual a `cybersec`
* Tag `funcion` igual a `datos`
* Sube el archivo [pokemon.csv](pokemon.csv) a la raíz de dicho bucket

### Evaluación

* 1 punto: El script comprobará que es posible acceder al fichero de datos si se poseen los permisos IAM correspondientes.

## Despliegue del bucket de recursos estáticos

Crea un bucket para la web con las siguientes características:

* Tag `proyecto` igual a `cybersec`
* Tag `funcion` igual a `web`
* Configura el bucket para que funcione como un servidor web
* Sube el archivo `index.html` a la raíz de dicho bucket

### Evaluación

* 1 puntos: El script comprobará que es posible acceder al fichero [index.html](index.html) utilizando su dirección web pública.


## Despliegue de la VPC principal

**NOTA**: puedes intentar utilizar el wizard de creación de VPCs para completar buena parte de los requerimientos de esta sección, pero verás que no se adapta totalmente a ellos. Mi recomendación sería llevar a cabo la configuración de forma manual. Además, así reforzarás el aprendizaje.

**NOTA**: si se te resisten los rangos de red, prueba a visitar [cidr.xyz](https://cidr.xyz/) para experimientar con ellos. También puedes utilizar [claude.ai](https://claude.ai/), [chatgpt](https://chatgpt.com/) o tu IA favorita para inspirarte. O, incluso, preguntarme ;)

Despliega una VPC con las siguientes características:

* Tag `proyecto` igual a `cybersec`
* Tag `funcion` igual a `red`
* Rango CIDR /16
* Dividida en tiers: público (con acceso a internet directo mediante IGW), privado (con acceso a internet indirecto a través de un NATgw) e interno (sin acceso a internet).
* El NATgw tiene que ser zonal (no regional), uno en cada AZ.
* Cada subnet pública e interna tiene que tener capacidad para 256 máquinas (aproximadamente)
* Cada subnet interna tiene que tener capaciad para 1024 máquinas (aproximadamente)

### Evaluación

* 1 punto: El script comprobará que los rangos de la VPC y sus subredes cumplen con los criterios.
* 2 puntos: El script comprobará que las tablas de rutas están correctamente asignadas a cada subred.

## Firewalls

Tocará crear los security groups y enlazarlos correctamente.

**Balanceador:**

* Tag `proyecto` igual a `cybersec`
* Tag `funcion` igual a `red`
* Nombre `albsg`
* Puertos de entrada abiertos: 80 (desde cualquier lugar) y 443 (desde cualquier lugar)

**Aplicación:**

* Tag `proyecto` igual a `cybersec`
* Tag `funcion` igual a `red`
* Nombre `appsg`
* Puertos de entrada abiertos: 8080 (desde `albsg`)

**Base de datos:**

* Tag `proyecto` igual a `cybersec`
* Tag `funcion` igual a `red`
* Nombre `bdsg`
* Puertos de entrada abiertos: 5432 (desde `appsg`)

### Evaluación

* 1 punto: El script comprobará que los tres security groups están correctamente creados en la VPC del proyecto y enlazados entre ellos

## Base de datos

Despliega una base de datos con las siguientes características:

* Postgres
* Subnet group con las subnets internas
* Nodo principal
* Nodo standby (para alta disponibilidad)
* Security group `bdsg`

### Evaluación

* 1 punto: El script comprobará que la base de datos cumple con todas las características mencionadas

## Balanceador de carga

Configura un balanceador tipo ALB para poder acceder desde el exterior a la capa de computación.

**Target group:**

* Tag `proyecto` igual a `cybersec`
* Tag `funcion` igual a `lb`
* Nombre `maintg`
* Puerto de destino: 8080
* Healthcheck activo, pero configuración por defecto

**ALB:**

* Tag `proyecto` igual a `cybersec`
* Tag `funcion` igual a `lb`
* Nombre `pokemonlb`
* Security group `lbsg`
* Listener al puerto 80 (HTTP)
* Todas las peticiones redirigidas al target group `maintg`

### Evaluación

* 1 punto: EL script comprobará que tanto el *Target Group* como el *ALB* siguen la especificación

## Capa de computación

Nuestra clásica aplicación de Pokémon, en un autoscaling group.

**Launch Template:**

* Tag `proyecto` igual a `cybersec`
* Tag `funcion` igual a `computacion`
* AMI Ubuntu
* Proporciona acceso desde la máquina al API de AWS asignando un *role* (hipotéticamente lo utilizaríamos para descargar la base de datos `pokemon.csv`)
* Utiliza `userdata.sh` como *user data*

**Autoscaling Group:**

* Basado en el *Launch Template* anterior, lógicamente
* Despliegue en las subredes privadas (no públicas, no internas)
* Autoasignación de instancias al *Target Group* `maintg`
* Desired a 2 instancias, sin elasticidad

### Evaluación

* 1 punto: El script comprobará que el launch template está configurado según la especificación
* 1 punto: El script comprobará que el autoescaling group está configurado según la especificación, con las máquinas funcionando correctamente y registradas como healthy en el target group, así como que es posible establecer comunicación a través de internet con los servidores y obtener un pokémon.


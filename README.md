# NestJS Memory Monitor Dashboard

Un dashboard de monitoreo en tiempo real creado con **React + Vite**, usando WebSockets para escuchar eventos de uso de memoria reportados por otras APIs construidas en **NestJS**.

El monitor ha sido diseñado con un estilo "Glassmorphism" y modo oscuro ultra moderno. Ahora permite **seleccionar y visualizar múltiples proyectos a la vez** y comparar su consumo de memoria simultáneamente.

## Instalación y Ejecución del Dashboard

1. Instala las dependencias:
```bash
npm install
```

2. Corre el servidor de desarrollo:
```bash
npm run dev
```

El Frontend arrancará (por lo general en `http://localhost:5173`).

---

## 🚀 Guía Paso a Paso: Integrar una API NestJS al Monitor

Cualquier proyecto de NestJS puede enviar sus métricas a este dashboard agregando un sencillo Gateway WebSocket. Sigue estos pasos en **cada una de tus APIs NestJS**:

### 1. Instalar dependencias WebSocket
En el proyecto NestJS, debes instalar el paquete de sockets:
```bash
npm install @nestjs/platform-socket.io @nestjs/websockets socket.io
```

### 2. Crear el MemoryMonitorGateway
Crea un archivo llamado `memory-monitor.gateway.ts` (por ejemplo, en un módulo global o `app.module.ts`) con el siguiente código:

```typescript
import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { OnModuleInit } from '@nestjs/common';
import { Server } from 'socket.io';

// El frontend local intentará conectarse al puerto 3010 por defecto,
// pero puedes ajustar los puertos en el archivo App.tsx si decides cambiarlos.
@WebSocketGateway(3010, { cors: true }) 
export class MemoryMonitorGateway implements OnModuleInit {
  @WebSocketServer()
  server: Server;

  onModuleInit() {
    // Reportar las métricas de memoria cada 2 segundos
    setInterval(() => {
      const memoryData = process.memoryUsage();
      
      this.server.emit('memory_stats', {
        timestamp: new Date().toISOString(),
        heapUsed: memoryData.heapUsed,
        heapTotal: memoryData.heapTotal,
        rss: memoryData.rss,
        external: memoryData.external,
      });
    }, 2000); 
  }
}
```

### 3. Declararlo como Proveedor
Asegúrate de agregar este Provider a la configuración de tu módulo, usualmente en `app.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { MemoryMonitorGateway } from './memory-monitor.gateway';

@Module({
  imports: [],
  providers: [MemoryMonitorGateway], // <-- Agregado aquí
})
export class AppModule {}
```

### 4. Reinicia tu API NestJS
Levanta tu proyecto NestJS de nuevo:
```bash
npm run start:dev
```

¡Eso es todo! Ahora el proyecto en NestJS estará emitiendo sus métricas por WebSockets. Si tu backend y el monitor están corriendo al mismo tiempo, el panel en el Dashboard Vite automáticamente dejará de mostrar *Mock Data* y pasará al estado **🟢 Live**, graficando el consumo real de tu API.

---

## 🎨 Modo Prueba (Mock Data) Incorporado

Si accedes al dashboard pero los proyectos backend en NestJS no están funcionando, el frontend utilizará simuladores aleatorios que imitan el comportamiento de la RAM. De este modo, puedes ver el funcionamiento completo de la interfaz, curvas de la memoria, y visualización multiproyectos en cualquier momento sin necesidad de tener el backend listo.

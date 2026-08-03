// Real-time Temperature Telemetry Simulator with Breach Alerting

import { Order, TemperatureTelemetry, TRANSPORT_TEMP_RANGES } from '../types';

export interface TelemetryListener {
  (telemetry: TemperatureTelemetry, isAlertBreach: boolean): void;
}

export class TemperatureSimulator {
  private static instance: TemperatureSimulator;
  private timer: any = null;
  private listeners: TelemetryListener[] = [];
  private currentTemps: Record<string, number> = {};

  private constructor() {}

  public static getInstance(): TemperatureSimulator {
    if (!TemperatureSimulator.instance) {
      TemperatureSimulator.instance = new TemperatureSimulator();
    }
    return TemperatureSimulator.instance;
  }

  public subscribe(listener: TelemetryListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  public startSimulation(activeOrders: Order[], onTelemetryGenerated: (telemetry: TemperatureTelemetry) => void) {
    if (this.timer) clearInterval(this.timer);

    this.timer = setInterval(() => {
      const inTransitOrders = activeOrders.filter(o => o.status === 'IN_TRANSIT');
      if (inTransitOrders.length === 0) return;

      inTransitOrders.forEach(order => {
        const range = TRANSPORT_TEMP_RANGES[order.transportType] || TRANSPORT_TEMP_RANGES['REFRIGERATED_2_8C'];
        
        // Initialize base temp if not set
        if (this.currentTemps[order.id] === undefined) {
          this.currentTemps[order.id] = (range.min + range.max) / 2;
        }

        // Random thermal drift (-0.4°C to +0.4°C)
        let delta = (Math.random() - 0.48) * 0.8;
        let newTemp = +(this.currentTemps[order.id] + delta).toFixed(2);
        this.currentTemps[order.id] = newTemp;

        // Check breach
        const isBreach = newTemp < range.min || newTemp > range.max;

        // GPS simulated movement in Germany (Berlin / Munich routes)
        const baseLat = 52.5200;
        const baseLng = 13.4050;
        const latOffset = (Math.random() - 0.5) * 0.05;
        const lngOffset = (Math.random() - 0.5) * 0.05;

        const telemetry: TemperatureTelemetry = {
          id: `TEL-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          orderId: order.id,
          sensorId: `SENSOR-THERMO-${order.transportType.substring(0, 4)}-01`,
          tempCelsius: newTemp,
          ambientTempCelsius: 22.5,
          humidityPercent: Math.floor(45 + Math.random() * 20),
          batteryLevelPercent: 96,
          isBreach,
          timestamp: new Date().toISOString(),
          gpsLatitude: +(baseLat + latOffset).toFixed(5),
          gpsLongitude: +(baseLng + lngOffset).toFixed(5)
        };

        onTelemetryGenerated(telemetry);
        this.listeners.forEach(l => l(telemetry, isBreach));
      });
    }, 4000); // Pulse every 4 seconds
  }

  public triggerManualTempSpike(order: Order, targetTemp: number) {
    this.currentTemps[order.id] = targetTemp;
  }

  public stopSimulation() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}

export const tempSimulator = TemperatureSimulator.getInstance();

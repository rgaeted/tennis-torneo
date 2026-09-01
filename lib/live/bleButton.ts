export type BleNotifyListener = () => void;

export type BleNotifyHandle = {
  deviceId: string;
  deviceName: string;
  stop: () => Promise<void>;
};

type BleCharacteristicLike = {
  properties: { notify?: boolean };
  startNotifications(): Promise<unknown>;
  stopNotifications(): Promise<unknown>;
  addEventListener(type: string, listener: () => void): void;
  removeEventListener(type: string, listener: () => void): void;
};

type BleServiceLike = {
  getCharacteristics(): Promise<BleCharacteristicLike[]>;
};

type BleGattLike = {
  connect(): Promise<BleGattLike>;
  disconnect(): void;
  getPrimaryServices(): Promise<BleServiceLike[]>;
};

type BleDeviceLike = {
  id: string;
  name?: string | null;
  gatt?: BleGattLike | null;
};

type RequestDeviceOptions = {
  acceptAllDevices?: boolean;
  optionalServices?: Array<number | string>;
};

export type BluetoothRequestApi = {
  requestDevice(options: RequestDeviceOptions): Promise<BleDeviceLike>;
};

export async function connectBleNotifyButton(
  bluetooth: BluetoothRequestApi,
  onPress: BleNotifyListener,
): Promise<BleNotifyHandle> {
  const device = await bluetooth.requestDevice({
    acceptAllDevices: true,
    optionalServices: [0xffe0, 0x1812, 0x1802, 0x180f],
  });
  if (!device.gatt) throw new Error("Este dispositivo no envía pulsaciones BLE compatibles");
  const server = await device.gatt.connect();
  const services = await server.getPrimaryServices();
  for (const service of services) {
    const chars = await service.getCharacteristics();
    const notify = chars.find((c) => c.properties.notify);
    if (!notify) continue;
    await notify.startNotifications();
    const listener = () => onPress();
    notify.addEventListener("characteristicvaluechanged", listener);
    return {
      deviceId: device.id,
      deviceName: device.name ?? "Botón BLE",
      stop: async () => {
        notify.removeEventListener("characteristicvaluechanged", listener);
        await notify.stopNotifications();
        device.gatt?.disconnect();
      },
    };
  }
  throw new Error("Este dispositivo no envía pulsaciones BLE compatibles");
}

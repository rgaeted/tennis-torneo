import { describe, it, expect, vi } from "vitest";
import { connectBleNotifyButton } from "./bleButton";

function fakeDevice(chars: Array<{ notify: boolean }>) {
  const characteristic = {
    properties: { notify: chars[0]?.notify ?? false },
    startNotifications: vi.fn(async () => characteristic),
    stopNotifications: vi.fn(async () => characteristic),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  };
  const service = {
    getCharacteristics: vi.fn(async () => chars[0] ? [characteristic] : []),
  };
  const gatt = {
    connect: vi.fn(async () => gatt),
    disconnect: vi.fn(),
    getPrimaryServices: vi.fn(async () => chars.length ? [service] : []),
  };
  return {
    id: "dev-1",
    name: "ITAG",
    gatt,
    characteristic,
    requestApi: {
      requestDevice: vi.fn(async () => ({ id: "dev-1", name: "ITAG", gatt })),
    },
  };
}

describe("connectBleNotifyButton", () => {
  it("se suscribe a la primera characteristic notify", async () => {
    const fake = fakeDevice([{ notify: true }]);
    const onPress = vi.fn();
    const handle = await connectBleNotifyButton(fake.requestApi, onPress);
    expect(handle.deviceId).toBe("dev-1");
    expect(handle.deviceName).toBe("ITAG");
    expect(fake.characteristic.startNotifications).toHaveBeenCalled();
    const add = fake.characteristic.addEventListener.mock.calls[0];
    expect(add[0]).toBe("characteristicvaluechanged");
    add[1]();
    expect(onPress).toHaveBeenCalledTimes(1);
    await handle.stop();
    expect(fake.characteristic.stopNotifications).toHaveBeenCalled();
    expect(fake.gatt.disconnect).toHaveBeenCalled();
  });

  it("falla si no hay notify", async () => {
    const fake = fakeDevice([{ notify: false }]);
    await expect(connectBleNotifyButton(fake.requestApi, () => {})).rejects.toThrow(
      "Este dispositivo no envía pulsaciones BLE compatibles",
    );
  });
});

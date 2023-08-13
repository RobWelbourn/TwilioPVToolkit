import { getTunnelInfo } from "../ngrok";

describe('Ngrok module', () => {
    test('Check tunnel info', async () => {
        const tunnelInfo = await getTunnelInfo();
        expect(tunnelInfo.publicUrl).toBeDefined();
        expect(tunnelInfo.publicUrl.startsWith('https://')).toBe(true);
        expect(tunnelInfo.localPort).toBeDefined();
        expect(Number.isInteger(tunnelInfo.localPort)).toBe(true);
    });
});
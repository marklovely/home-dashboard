import { describe, expect, it } from 'vitest';
import {
  buildGo2RtcPlayerUrl,
  isCamerasConfigured,
  normalizeCamerasProfile,
  readCamerasFromProfile,
  sortCameraStreams
} from '../src/lib/cameraProfile.js';

describe('cameraProfile', () => {
  it('normalizes empty cameras config', () => {
    expect(normalizeCamerasProfile(null)).toEqual({
      enabled: false,
      gatewayUrl: '',
      streams: []
    });
  });

  it('reads cameras from site profile', () => {
    const profile = {
      cameras: {
        enabled: true,
        gatewayUrl: 'https://192.168.4.37:1984',
        streams: [{ id: 'front-door', label: 'Front door', src: 'front_door', primary: true }]
      }
    };
    expect(readCamerasFromProfile(profile).streams).toHaveLength(1);
    expect(isCamerasConfigured(readCamerasFromProfile(profile))).toBe(true);
  });

  it('builds go2rtc player URLs', () => {
    expect(buildGo2RtcPlayerUrl('https://192.168.4.37:1984/', 'front_door')).toBe(
      'https://192.168.4.37:1984/stream.html?src=front_door&mode=webrtc'
    );
  });

  it('sorts primary streams first', () => {
    const sorted = sortCameraStreams([
      { id: 'kitchen', label: 'Kitchen', src: 'kitchen' },
      { id: 'door', label: 'Door', src: 'door', primary: true }
    ]);
    expect(sorted[0].id).toBe('door');
  });
});

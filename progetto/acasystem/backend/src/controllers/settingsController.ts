import type { Request, Response } from 'express';
import { sendFailure } from '../middlewares/errors.ts';
import type { SettingsService } from '../services/settingsService.ts';
import {
  type DeviceQuery,
  validateCurrentSettingsBody,
  validateDeviceLabelBody,
  validateDeviceQuery,
  validatePublishBody,
  validateUserQuery,
} from '../validators/settingsValidators.ts';
import { valid } from '../validators/common.ts';
import { andThen, authed, respond } from './requestUser.ts';

/** Gestori HTTP di /api/settings. */

type Handler = (req: Request, res: Response) => void;

export interface SettingsController {
  getCurrent: Handler;
  listHistory: Handler;
  deleteHistory: Handler;
  listDevices: Handler;
  deleteDevice: Handler;
  updateDeviceLabel: Handler;
  putCurrent: Handler;
  publish: Handler;
}

export const createSettingsController = (service: SettingsService): SettingsController => {
  /** Utente autenticato e query con ha_user_id/device_id; il risultato di `run` è la risposta. */
  const deviceRoute = (run: (query: DeviceQuery) => unknown): Handler =>
    authed((req, res, userId) => {
      respond(res, andThen(validateDeviceQuery(req.query, userId), (query) => valid(run(query))));
    });

  return {
    getCurrent: deviceRoute((q) => service.getCurrent(q.haUserId, q.deviceId, q.revision)),

    listHistory: deviceRoute((q) => service.listHistory(q.haUserId, q.deviceId, q.limit)),

    deleteHistory: deviceRoute((q) => service.deleteHistory(q.haUserId, q.deviceId, q.keepLatest)),

    listDevices: authed((req, res, userId) => {
      respond(res, andThen(validateUserQuery(req.query, userId), (haUserId) => valid(service.listDevices(haUserId))));
    }),

    deleteDevice: deviceRoute((q) => service.deleteDevice(q.haUserId, q.deviceId)),

    updateDeviceLabel: authed((req, res, userId) => {
      const input = validateDeviceLabelBody(req.body, userId);
      respond(res, andThen(input, (value) => service.updateDeviceLabel(value)));
    }),

    putCurrent: authed((req, res, userId) => {
      const input = validateCurrentSettingsBody(req.body, userId);
      if (!input.ok) {
        sendFailure(res, input.failure);
        return;
      }

      const result = service.writeCurrent(input.value);
      if (!result.ok) {
        res.status(result.status).json({
          error: result.error,
          ...(Number.isFinite(Number(result.revision)) ? { revision: Number(result.revision) } : {}),
        });
        return;
      }

      res.json({
        ha_user_id: input.value.haUserId,
        device_id: input.value.deviceId,
        revision: result.revision,
        updated_at: result.updated_at,
      });
    }),

    publish: authed((req, res, userId) => {
      const input = validatePublishBody(req.body, userId);
      respond(res, andThen(input, (value) => service.publish(value)));
    }),
  };
};

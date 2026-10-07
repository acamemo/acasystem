import type { Request, Response } from 'express';
import { sendFailure } from '../middlewares/errors.ts';
import type { SettingsService } from '../services/settingsService.ts';
import {
  validateCurrentSettingsBody,
  validateDeviceLabelBody,
  validateDeviceQuery,
  validatePublishBody,
  validateUserQuery,
} from '../validators/settingsValidators.ts';
import { requireRequestUserId } from './requestUser.ts';

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
  /** Utente autenticato e query con ha_user_id/device_id; null se ha già risposto. */
  const readDeviceQuery = (req: Request, res: Response) => {
    const requestUserId = requireRequestUserId(req, res);
    if (!requestUserId) return null;

    const query = validateDeviceQuery(req.query, requestUserId);
    if (!query.ok) {
      sendFailure(res, query.failure);
      return null;
    }
    return query.value;
  };

  return {
    getCurrent: (req, res) => {
      const query = readDeviceQuery(req, res);
      if (!query) return;
      res.json(service.getCurrent(query.haUserId, query.deviceId, query.revision));
    },

    listHistory: (req, res) => {
      const query = readDeviceQuery(req, res);
      if (!query) return;
      res.json(service.listHistory(query.haUserId, query.deviceId, query.limit));
    },

    deleteHistory: (req, res) => {
      const query = readDeviceQuery(req, res);
      if (!query) return;
      res.json(service.deleteHistory(query.haUserId, query.deviceId, query.keepLatest));
    },

    listDevices: (req, res) => {
      const requestUserId = requireRequestUserId(req, res);
      if (!requestUserId) return;

      const haUserId = validateUserQuery(req.query, requestUserId);
      if (!haUserId.ok) {
        sendFailure(res, haUserId.failure);
        return;
      }
      res.json(service.listDevices(haUserId.value));
    },

    deleteDevice: (req, res) => {
      const query = readDeviceQuery(req, res);
      if (!query) return;
      res.json(service.deleteDevice(query.haUserId, query.deviceId));
    },

    updateDeviceLabel: (req, res) => {
      const requestUserId = requireRequestUserId(req, res);
      if (!requestUserId) return;

      const input = validateDeviceLabelBody(req.body, requestUserId);
      if (!input.ok) {
        sendFailure(res, input.failure);
        return;
      }

      const result = service.updateDeviceLabel(input.value);
      if (!result.ok) {
        sendFailure(res, result.failure);
        return;
      }
      res.json(result.value);
    },

    putCurrent: (req, res) => {
      const requestUserId = requireRequestUserId(req, res);
      if (!requestUserId) return;

      const input = validateCurrentSettingsBody(req.body, requestUserId);
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
    },

    publish: (req, res) => {
      const requestUserId = requireRequestUserId(req, res);
      if (!requestUserId) return;

      const input = validatePublishBody(req.body, requestUserId);
      if (!input.ok) {
        sendFailure(res, input.failure);
        return;
      }

      const result = service.publish(input.value);
      if (!result.ok) {
        sendFailure(res, result.failure);
        return;
      }
      res.json(result.value);
    },
  };
};

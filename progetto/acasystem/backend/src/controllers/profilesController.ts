import type { Request, Response } from 'express';
import type { ProfileService } from '../services/profileService.ts';
import {
  validateCreateProfileBody,
  validateListProfilesQuery,
  validateUpdateProfileBody,
} from '../validators/profileValidators.ts';
import { valid } from '../validators/common.ts';
import { andThen, authed, respond } from './requestUser.ts';

/** Gestori HTTP di /api/profiles. */

export interface ProfilesController {
  list(req: Request, res: Response): void;
  get(req: Request<{ id: string }>, res: Response): void;
  create(req: Request, res: Response): void;
  update(req: Request<{ id: string }>, res: Response): void;
  remove(req: Request<{ id: string }>, res: Response): void;
}

export const createProfilesController = (service: ProfileService): ProfilesController => ({
  // List profiles for a HA user
  list: authed((req, res, userId) => {
    respond(res, andThen(validateListProfilesQuery(req.query, userId), (query) => valid(service.list(query.haUserId))));
  }),

  // Get a single profile
  get: authed((req, res, userId) => {
    respond(res, service.get(userId, req.params.id));
  }),

  // Create a new profile
  create: authed((req, res, userId) => {
    const input = validateCreateProfileBody(req.body, userId);
    respond(res, andThen(input, (value) => service.create(value)), 201);
  }),

  // Update a profile
  update: authed((req, res, userId) => {
    const input = validateUpdateProfileBody(req.body, userId);
    respond(res, andThen(input, (value) => service.update(userId, req.params.id, value)));
  }),

  // Delete a profile
  remove: authed((req, res, userId) => {
    respond(res, service.remove(userId, req.params.id));
  }),
});

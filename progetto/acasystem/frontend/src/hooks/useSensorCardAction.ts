import { useCallback, useEffect, useRef, useState } from 'react';
import type { EntityLikeMap, HaMessageConnection, ServiceData } from '@/@types/ha';
import { callService as haCallService } from '@/api/haClient';
import {
  resolveSensorCardActionCall,
  sensorActionExpectationMatches,
  type SensorActionExpectation,
  type SensorActionInput,
} from '@/utils/sensorCardConfig';

const EMPTY_ENTITIES: EntityLikeMap = {};

export type SensorActionStatus = 'idle' | 'pending' | 'sent' | 'confirmed' | 'timeout' | 'error';

interface ActionFeedback {
  status: SensorActionStatus;
  error: unknown;
}

interface ActionRequest {
  acknowledged: boolean;
  expectation: SensorActionExpectation | null;
  timer: ReturnType<typeof setTimeout> | null;
  actionKey: string;
}

export interface SensorCardActionOptions {
  conn: HaMessageConnection | null | undefined;
  connected?: boolean;
  callService?: ((domain: string, service: string, data: ServiceData) => unknown) | null;
  action: SensorActionInput | null | undefined;
  entities?: EntityLikeMap;
  onOpen?: ((entityId: unknown) => void) | null;
  onError?: ((error: unknown) => void) | null;
  disabled?: boolean;
  timeoutMs?: number;
  feedbackMs?: number;
}

export function useSensorCardAction({
  conn,
  connected = true,
  callService = undefined,
  action,
  entities = EMPTY_ENTITIES,
  onOpen = undefined,
  onError = undefined,
  disabled = false,
  timeoutMs = 10000,
  feedbackMs = 2500,
}: SensorCardActionOptions) {
  const [feedback, setFeedback] = useState<ActionFeedback>({ status: 'idle', error: null });
  const requestRef = useRef<ActionRequest | null>(null);
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const entitiesRef = useRef(entities);
  entitiesRef.current = entities;
  const actionKey = JSON.stringify([action?.type, action?.entityId, action?.service, action?.data]);

  const reset = useCallback(() => {
    clearTimeout(requestRef.current?.timer ?? undefined);
    clearTimeout(feedbackTimerRef.current);
    requestRef.current = null;
    setFeedback({ status: 'idle', error: null });
  }, []);

  const finish = useCallback(
    (request: ActionRequest, status: SensorActionStatus, error: unknown = null) => {
      if (requestRef.current !== request) return;
      clearTimeout(request.timer ?? undefined);
      requestRef.current = null;
      setFeedback({ status, error });
      clearTimeout(feedbackTimerRef.current);
      feedbackTimerRef.current = setTimeout(() => {
        setFeedback({ status: 'idle', error: null });
      }, feedbackMs);
    },
    [feedbackMs]
  );

  useEffect(() => {
    const request = requestRef.current;
    if (
      request?.acknowledged &&
      request.expectation &&
      sensorActionExpectationMatches(request.expectation, entities)
    ) {
      finish(request, 'confirmed');
    }
  }, [entities, finish]);

  useEffect(() => {
    if (disabled) reset();
  }, [disabled, reset]);

  useEffect(() => {
    if (requestRef.current && requestRef.current.actionKey !== actionKey) reset();
  }, [actionKey, reset]);

  useEffect(
    () => () => {
      clearTimeout(requestRef.current?.timer ?? undefined);
      clearTimeout(feedbackTimerRef.current);
      requestRef.current = null;
    },
    []
  );

  const execute = useCallback(
    async (override?: string | SensorActionInput | null): Promise<boolean> => {
      if (disabled || requestRef.current) return false;
      const resolvedAction: SensorActionInput = {
        ...action,
        ...(typeof override === 'string' ? { type: override } : override),
      };
      if (resolvedAction.type === 'none') return false;
      if (resolvedAction.type === 'more-info') {
        onOpen?.(resolvedAction.entityId);
        return true;
      }
      clearTimeout(feedbackTimerRef.current);
      const request: ActionRequest = {
        acknowledged: false,
        expectation: null,
        timer: null,
        actionKey,
      };
      requestRef.current = request;
      setFeedback({ status: 'pending', error: null });
      request.timer = setTimeout(() => finish(request, 'timeout'), timeoutMs);

      try {
        if (!conn || connected === false) throw new Error('disconnected');
        const targetEntity =
          entitiesRef.current[String(resolvedAction.entityId)] || resolvedAction.targetEntity;
        const call = resolveSensorCardActionCall(resolvedAction, targetEntity);
        if (!call) {
          finish(request, 'idle');
          return false;
        }
        request.expectation = call.expectation;
        await (callService
          ? callService(call.domain, call.service, call.data)
          : haCallService(conn, call.domain, call.service, call.data));
        if (requestRef.current !== request) return false;
        request.acknowledged = true;
        if (!call.expectation) finish(request, 'sent');
        else if (sensorActionExpectationMatches(call.expectation, entitiesRef.current)) {
          finish(request, 'confirmed');
        }
        return true;
      } catch (error) {
        if (requestRef.current === request) {
          finish(request, 'error', error);
          onError?.(error);
        }
        return false;
      }
    },
    [action, actionKey, callService, conn, connected, disabled, finish, onError, onOpen, timeoutMs]
  );

  return {
    execute,
    pending: feedback.status === 'pending',
    status: feedback.status,
    error: feedback.error,
    reset,
  };
}

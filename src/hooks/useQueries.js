import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext.jsx';
import { departmentsApi, categoriesApi } from '../api/taxonomy.js';
import { listEvents, getEvent, listFormFields, listOrganizerLevels } from '../api/events.js';
import { myRegistrations, countsForDept, countsForEvent, allCounts } from '../api/registrations.js';
import { getRoster } from '../api/roster.js';
import { listFeedbacks } from '../api/feedbacks.js';
import { listUsers } from '../api/profiles.js';

export function useDepartments() {
  return useQuery({ queryKey: ['departments'], queryFn: departmentsApi.list });
}

export function useCategories() {
  return useQuery({ queryKey: ['categories'], queryFn: categoriesApi.list });
}

export function useEvents(filters = {}) {
  return useQuery({ queryKey: ['events', filters], queryFn: () => listEvents(filters) });
}

export function useEvent(id) {
  return useQuery({ queryKey: ['event', id], queryFn: () => getEvent(id), enabled: Boolean(id) });
}

export function useFormFields(eventId, { includeInactive = false } = {}) {
  return useQuery({
    queryKey: ['form-fields', eventId, includeInactive],
    queryFn: () => listFormFields(eventId, { includeInactive }),
    enabled: Boolean(eventId),
  });
}

export function useMyRegistrations(activeOnly = false) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['my-registrations', user?.id, activeOnly],
    queryFn: () => myRegistrations(user.id, { activeOnly }),
    enabled: Boolean(user),
  });
}

export function useDeptCounts() {
  const { profile } = useAuth();
  return useQuery({
    queryKey: ['dept-counts', profile?.department_id],
    queryFn: () => countsForDept(profile.department_id),
    enabled: Boolean(profile?.department_id),
  });
}

export function useEventCounts(eventId) {
  return useQuery({
    queryKey: ['event-counts', eventId],
    queryFn: () => countsForEvent(eventId),
    enabled: Boolean(eventId),
  });
}

export function useAllCounts() {
  return useQuery({ queryKey: ['all-counts'], queryFn: allCounts });
}

export function useRoster(eventId) {
  return useQuery({ queryKey: ['roster', eventId], queryFn: () => getRoster(eventId), enabled: Boolean(eventId) });
}

export function useFeedbacks(unreadOnly = false) {
  return useQuery({ queryKey: ['feedbacks', unreadOnly], queryFn: () => listFeedbacks({ unreadOnly }) });
}

export function useUsers(filters = {}) {
  return useQuery({ queryKey: ['users', filters], queryFn: () => listUsers(filters) });
}

export function useOrganizerLevels(userId) {
  return useQuery({
    queryKey: ['organizer-levels', userId],
    queryFn: () => listOrganizerLevels(userId),
    enabled: Boolean(userId),
  });
}
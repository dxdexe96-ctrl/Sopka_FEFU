import { findOrCreateStudent } from './api.js';

export const roleOptions = [
  'Руководитель',
  'Организатор',
  'Исполнитель',
  'Волонтер',
  'Участник',
];

export function formatPhone(value) {
  if (!value) return '';
  const digits = value.toString().replace(/\D/g, '').slice(-10);
  const a = digits.slice(0, 3);
  const b = digits.slice(3, 6);
  const c = digits.slice(6, 8);
  const d = digits.slice(8, 10);
  if (!a) return '+7';
  if (!b) return `+7 (${a}`;
  if (!c) return `+7 (${a}) ${b}`;
  if (!d) return `+7 (${a}) ${b}-${c}`;
  return `+7 (${a}) ${b}-${c}-${d}`;
}

export function normalizePhoneDigits(value) {
  let digits = String(value || '').replace(/\D/g, '');
  if (digits && !digits.startsWith('7')) digits = `7${digits}`;
  return digits.slice(0, 11);
}

export function isValidPhone(phone) {
  const digits = normalizePhoneDigits(phone);
  return digits.length === 11 && digits.startsWith('7');
}

export function parseFio(fio) {
  const parts = (fio || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return { last_name: '', first_name: '', middle_name: null };
  }
  if (parts.length === 1) {
    return { last_name: parts[0], first_name: '—', middle_name: null };
  }
  if (parts.length === 2) {
    return { last_name: parts[0], first_name: parts[1], middle_name: null };
  }
  return {
    last_name: parts[0],
    first_name: parts[1],
    middle_name: parts.slice(2).join(' '),
  };
}

export function getStudentFullName(student) {
  return [student?.last_name, student?.first_name, student?.middle_name]
    .filter((part) => part && part !== '—')
    .join(' ');
}

export function findStudentByPhone(studentsList, phone) {
  const digits = normalizePhoneDigits(phone);
  if (!digits) return null;
  return studentsList.find((student) => normalizePhoneDigits(student.phone) === digits) || null;
}

export function getParticipantValidationMessages(participants) {
  const messages = [];
  participants.forEach((participant, index) => {
    const number = index + 1;
    if (!(participant.fio || '').trim()) {
      messages.push(`Укажите ФИО участника ${number}.`);
    }
    if (!isValidPhone(participant.phone)) {
      messages.push(`Укажите корректный телефон участника ${number}.`);
    }
  });
  return messages;
}

export function buildParticipantNotes(participant) {
  const slots = participant.timeSlots
    .filter((slot) => slot.date || slot.start || slot.end)
    .map((slot) => [
      slot.date,
      slot.start && slot.end ? `${slot.start}-${slot.end}` : `${slot.start || ''}${slot.end ? `-${slot.end}` : ''}`,
    ]
      .filter(Boolean)
      .join(' '))
    .filter(Boolean);

  return slots.length > 0 ? `Интервалы участия: ${slots.join('; ')}` : null;
}

export async function resolveParticipantStudentId(participant, studentsCache) {
  if (participant.student_id) {
    return participant.student_id;
  }

  const existing = findStudentByPhone(studentsCache, participant.phone);
  if (existing) {
    return existing.student_id;
  }

  const { last_name, first_name, middle_name } = parseFio(participant.fio);
  const phone = Number(normalizePhoneDigits(participant.phone));
  const result = await findOrCreateStudent({
    last_name,
    first_name,
    middle_name,
    phone,
  });

  const student = result.student;
  if (!studentsCache.some((item) => item.student_id === student.student_id)) {
    studentsCache.push(student);
  }

  return student.student_id;
}

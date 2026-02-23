export type Shift = {
  id: string;
  name: string;
  start: string;
  end: string;
};

export type Settings = {
  appName?: string;
  hallName?: string;
  shifts?: Shift[];
  saturdayShifts?: Shift[];
  dayOverrides?: Record<string, Shift[]>;
  defaultPrintMode?: 'cards' | 'table' | 'minimal';
  defaultView?: 'month' | 'week';
  planningMode?: 'balanced' | 'strict' | 'lenient';
  maxNightShiftsPerWeek?: number;
  maxLoadDifference?: number;
  blockNightToMorning?: boolean;
  showWeekends?: boolean;
  showHolidays?: boolean;
  autoDayFocus?: boolean;
  autoSuggest?: boolean;
  hideInactiveInSelect?: boolean;
  showWeekNumbers?: boolean;
  showCoverageReport?: boolean;
  showBranding?: boolean;
  showSuccessToasts?: boolean;
  showInfoToasts?: boolean;
  warnDoubleShift?: boolean;
  warnUnderstaffed?: boolean;
  exportHoursSummary?: boolean;
  firstDayOfWeek?: 'monday' | 'sunday';
  employeePairs?: Array<{ id: string; emp1Id: string; emp2Id: string }>;
  [k: string]: unknown;
};

export type Employee = {
  id: string;
  name: string;
  surname: string;
  phone?: string;
  positionIds?: string[];
  active?: boolean;
  allowedShiftIds?: string[];
  created?: string;
  updated?: string;
};

export type Position = {
  id: string;
  name: string;
  targetCount?: number | null;
  priorityEmployeeIds?: string[];
  targetCounts?: Record<string, number>; // shiftId -> targetCount
  created?: string;
  updated?: string;
};

export type Vacation = {
  id: string;
  employeeId: string;
  start: string;
  end: string;
  type?: string;
  note?: string;
  created?: string;
  updated?: string;
};

export type Assignment = {
  id: string;
  date: string;
  shiftId: string;
  positionId: string;
  employeeIds?: string[];
  employeeId?: string;
  created?: string;
  updated?: string;
};

export type WeekTemplate = {
  id: string;
  name: string;
  items: unknown[];
  created?: string;
  updated?: string;
};

export type ScheduleState = {
  selectedDate: string;
  selectedDates: string[];
  visibleMonth: string; // YYYY-MM-01
};

export type BootstrapPayload = {
  settings: Settings;
  employees: Employee[];
  positions: Position[];
  vacations: Vacation[];
  assignments: Assignment[];
  weekTemplates: WeekTemplate[];
};

export type AppView = 'calendar' | 'employees' | 'employeePairs' | 'positions' | 'vacations' | 'weekPlanner' | 'email' | 'settings';

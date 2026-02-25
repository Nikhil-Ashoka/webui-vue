// Query keys for React Query
// Following best practices: https://tkdodo.eu/blog/effective-react-query-keys

export const queryKeys = {
  // Global
  global: {
    all: ['global'],
    bmcTime: () => [...queryKeys.global.all, 'bmcTime'],
    serviceLogin: () => [...queryKeys.global.all, 'serviceLogin'],
    currentUser: (username) => [
      ...queryKeys.global.all,
      'currentUser',
      username,
    ],
    accountService: () => [...queryKeys.global.all, 'accountService'],
    hmcManaged: () => [...queryKeys.global.all, 'hmcManaged'],
    safeMode: () => [...queryKeys.global.all, 'safeMode'],
    systemInfo: () => [...queryKeys.global.all, 'systemInfo'],
    bootProgress: () => [...queryKeys.global.all, 'bootProgress'],
    currentTask: (task) => [...queryKeys.global.all, 'currentTask', task],
  },

  // Authentication
  auth: {
    all: ['auth'],
    loginPageDetails: () => [...queryKeys.auth.all, 'loginPageDetails'],
    passwordChangeRequired: (username) => [
      ...queryKeys.auth.all,
      'passwordChangeRequired',
      username,
    ],
  },

  // Hardware Status
  hardware: {
    all: ['hardware'],
    system: () => [...queryKeys.hardware.all, 'system'],
    bmc: () => [...queryKeys.hardware.all, 'bmc'],
    chassis: () => [...queryKeys.hardware.all, 'chassis'],
    processors: () => [...queryKeys.hardware.all, 'processors'],
    memory: () => [...queryKeys.hardware.all, 'memory'],
    fans: () => [...queryKeys.hardware.all, 'fans'],
    powerSupplies: () => [...queryKeys.hardware.all, 'powerSupplies'],
    assembly: () => [...queryKeys.hardware.all, 'assembly'],
    pcieSlots: () => [...queryKeys.hardware.all, 'pcieSlots'],
    pcieTopology: () => [...queryKeys.hardware.all, 'pcieTopology'],
    fabricAdapters: () => [...queryKeys.hardware.all, 'fabricAdapters'],
    sensors: () => [...queryKeys.hardware.all, 'sensors'],
    concurrentMaintenance: () => [
      ...queryKeys.hardware.all,
      'concurrentMaintenance',
    ],
  },

  // Logs
  logs: {
    all: ['logs'],
    eventLogs: (filters) => [...queryKeys.logs.all, 'eventLogs', filters],
    auditLogs: (filters) => [...queryKeys.logs.all, 'auditLogs', filters],
    postCodeLogs: () => [...queryKeys.logs.all, 'postCodeLogs'],
    dumps: () => [...queryKeys.logs.all, 'dumps'],
    deconfigurationRecords: () => [
      ...queryKeys.logs.all,
      'deconfigurationRecords',
    ],
    ibmiServiceFunctions: () => [...queryKeys.logs.all, 'ibmiServiceFunctions'],
  },

  // Operations
  operations: {
    all: ['operations'],
    firmware: () => [...queryKeys.operations.all, 'firmware'],
    bootSettings: () => [...queryKeys.operations.all, 'bootSettings'],
    control: () => [...queryKeys.operations.all, 'control'],
    factoryReset: () => [...queryKeys.operations.all, 'factoryReset'],
    keyClear: () => [...queryKeys.operations.all, 'keyClear'],
    networkSettings: () => [...queryKeys.operations.all, 'networkSettings'],
  },

  // Resource Management
  resources: {
    all: ['resources'],
    powerControl: () => [...queryKeys.resources.all, 'powerControl'],
    resourceMemory: () => [...queryKeys.resources.all, 'resourceMemory'],
    systemParameters: () => [...queryKeys.resources.all, 'systemParameters'],
    fieldCoreOverride: () => [...queryKeys.resources.all, 'fieldCoreOverride'],
    license: () => [...queryKeys.resources.all, 'license'],
  },

  // Security and Access
  security: {
    all: ['security'],
    sessions: () => [...queryKeys.security.all, 'sessions'],
    users: () => [...queryKeys.security.all, 'users'],
    ldap: () => [...queryKeys.security.all, 'ldap'],
    certificates: () => [...queryKeys.security.all, 'certificates'],
    policies: () => [...queryKeys.security.all, 'policies'],
  },

  // Settings
  settings: {
    all: ['settings'],
    network: () => [...queryKeys.settings.all, 'network'],
    powerPolicy: () => [...queryKeys.settings.all, 'powerPolicy'],
    snmpAlerts: () => [...queryKeys.settings.all, 'snmpAlerts'],
    dateTime: () => [...queryKeys.settings.all, 'dateTime'],
    hardwareDeconfiguration: () => [
      ...queryKeys.settings.all,
      'hardwareDeconfiguration',
    ],
  },
};

// Made with Bob

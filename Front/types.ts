
export enum EntityType {
  FUNCTION = 'FUNCTION',
  MODEL = 'MODEL'
}

export enum ApiStatus {
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  DEPRECATED = 'DEPRECATED'
}

export interface Parameter {
  name: string;
  type: 'string' | 'number' | 'integer' | 'boolean' | 'object' | 'array';
  description: string;
  required: boolean;
}

export interface Relationship {
  targetModel: string;
  type: 'ForeignKey' | 'OneToOne' | 'ManyToMany';
  onDelete: 'CASCADE' | 'SET_NULL' | 'PROTECT';
}

export interface CustomFunction {
  id: string;
  name: string;
  description: string;
  code: string;
  language: 'python' | 'javascript';
  parametersSchema: Parameter[];
  returnSchema: string;
  externalApis: string[];
  status: ApiStatus;
  version: string;
  function_type?: 'standard' | 'database_query';
  is_active?: boolean;
}

export interface DataModel {
  id: string;
  name: string;
  fields: Array<{
    name: string;
    type: string;
    required: boolean;
    unique: boolean;
    maxLength?: number;
  }>;
  relationships: Relationship[];
  permissions: {
    list: 'public' | 'authenticated' | 'admin';
    create: 'authenticated' | 'admin';
    update: 'owner' | 'admin';
    delete: 'admin';
  };
}

export interface ApiToken {
  id: string;
  name: string;
  prefix: string;
  created_at: string;
  last_used?: string;
  is_active: boolean;
}

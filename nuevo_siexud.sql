-- Adminer 5.1.0 PostgreSQL 16.0 dump

\connect "nuevo_siexud";

DROP TABLE IF EXISTS "app_users";
DROP SEQUENCE IF EXISTS app_users_user_id_seq;
CREATE SEQUENCE app_users_user_id_seq INCREMENT 1 MINVALUE 1 MAXVALUE 2147483647 CACHE 1;

CREATE TABLE "public"."app_users" (
    "user_id" integer DEFAULT nextval('app_users_user_id_seq') NOT NULL,
    "username" character varying(50) NOT NULL,
    "email" character varying(200) NOT NULL,
    "full_name" character varying(200),
    "hashed_password" character varying(200) NOT NULL,
    "is_active" boolean NOT NULL,
    "is_admin" boolean NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL,
    CONSTRAINT "app_users_pkey" PRIMARY KEY ("user_id")
) WITH (oids = false);

CREATE UNIQUE INDEX app_users_username_key ON public.app_users USING btree (username);

CREATE UNIQUE INDEX app_users_email_key ON public.app_users USING btree (email);

CREATE INDEX ix_app_users_user_id ON public.app_users USING btree (user_id);


DROP TABLE IF EXISTS "entities";
DROP SEQUENCE IF EXISTS entities_id_seq;
CREATE SEQUENCE entities_id_seq INCREMENT 1 MINVALUE 1 MAXVALUE 2147483647 CACHE 1;

CREATE TABLE "public"."entities" (
    "entity_id" integer DEFAULT nextval('entities_id_seq') NOT NULL,
    "entity_name" character varying(255) NOT NULL,
    "tax_id" character varying(100) NOT NULL,
    "entity_type_id" integer NOT NULL,
    "main_address" character varying(200),
    "main_phone" character varying(100),
    "institutional_email" character varying(200),
    "website" character varying(200),
    "main_contact" character varying(100),
    "contact_position" character varying(100),
    "contact_phone" character varying(50),
    "contact_email" character varying(200),
    "last_update_date" date,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "created_by_user_id" integer,
    "updated_at" timestamp,
    "updated_by_user_id" integer,
    CONSTRAINT "pk_entities" PRIMARY KEY ("entity_id")
) WITH (oids = false);

COMMENT ON TABLE "public"."entities" IS 'External entities participating in projects';

COMMENT ON COLUMN "public"."entities"."tax_id" IS 'Tax identification number (NIT)';

CREATE UNIQUE INDEX uk_entities_tax_id ON public.entities USING btree (tax_id);

CREATE INDEX idx_entities_type ON public.entities USING btree (entity_type_id);

CREATE INDEX idx_entities_tax_id ON public.entities USING btree (tax_id);

CREATE INDEX idx_entities_active ON public.entities USING btree (is_active);


DROP TABLE IF EXISTS "entity_types";
DROP SEQUENCE IF EXISTS entity_types_id_seq;
CREATE SEQUENCE entity_types_id_seq INCREMENT 1 MINVALUE 1 MAXVALUE 2147483647 CACHE 1;

CREATE TABLE "public"."entity_types" (
    "entity_type_id" integer DEFAULT nextval('entity_types_id_seq') NOT NULL,
    "type_name" character varying(100) NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "created_by_user_id" integer,
    CONSTRAINT "pk_entity_types" PRIMARY KEY ("entity_type_id")
) WITH (oids = false);

COMMENT ON TABLE "public"."entity_types" IS 'Catalog of entity types';

COMMENT ON COLUMN "public"."entity_types"."entity_type_id" IS 'Primary key';

COMMENT ON COLUMN "public"."entity_types"."type_name" IS 'Name of the entity type';

COMMENT ON COLUMN "public"."entity_types"."is_active" IS 'Indicates if the type is active';

CREATE UNIQUE INDEX uk_entity_types_name ON public.entity_types USING btree (type_name);


DROP TABLE IF EXISTS "executing_departments";
DROP SEQUENCE IF EXISTS executing_departments_id_seq;
CREATE SEQUENCE executing_departments_id_seq INCREMENT 1 MINVALUE 1 MAXVALUE 2147483647 CACHE 1;

CREATE TABLE "public"."executing_departments" (
    "department_id" integer DEFAULT nextval('executing_departments_id_seq') NOT NULL,
    "department_name" character varying(200) NOT NULL,
    "website" character varying(200),
    "address" character varying(200),
    "phone" character varying(50),
    "email" character varying(100),
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "created_by_user_id" integer,
    "updated_at" timestamp,
    "updated_by_user_id" integer,
    CONSTRAINT "pk_executing_departments" PRIMARY KEY ("department_id")
) WITH (oids = false);

COMMENT ON TABLE "public"."executing_departments" IS 'University departments executing projects';

CREATE UNIQUE INDEX uk_executing_departments_name ON public.executing_departments USING btree (department_name);


DROP TABLE IF EXISTS "execution_modalities";
DROP SEQUENCE IF EXISTS execution_modalities_id_seq;
CREATE SEQUENCE execution_modalities_id_seq INCREMENT 1 MINVALUE 1 MAXVALUE 2147483647 CACHE 1;

CREATE TABLE "public"."execution_modalities" (
    "execution_modality_id" integer DEFAULT nextval('execution_modalities_id_seq') NOT NULL,
    "modality_name" character varying(100) NOT NULL,
    "modality_description" text,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "created_by_user_id" integer,
    "updated_at" timestamp,
    "updated_by_user_id" integer,
    CONSTRAINT "pk_execution_modalities" PRIMARY KEY ("execution_modality_id")
) WITH (oids = false);

COMMENT ON TABLE "public"."execution_modalities" IS 'Catalog of project execution modalities';

CREATE UNIQUE INDEX uk_execution_modalities_name ON public.execution_modalities USING btree (modality_name);


DROP TABLE IF EXISTS "financing_types";
DROP SEQUENCE IF EXISTS financing_types_id_seq;
CREATE SEQUENCE financing_types_id_seq INCREMENT 1 MINVALUE 1 MAXVALUE 2147483647 CACHE 1;

CREATE TABLE "public"."financing_types" (
    "financing_type_id" integer DEFAULT nextval('financing_types_id_seq') NOT NULL,
    "financing_name" character varying(100) NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    CONSTRAINT "pk_financing_types" PRIMARY KEY ("financing_type_id")
) WITH (oids = false);

COMMENT ON TABLE "public"."financing_types" IS 'Catalog of financing types';

CREATE UNIQUE INDEX uk_financing_types_name ON public.financing_types USING btree (financing_name);


DROP TABLE IF EXISTS "migration_log";
DROP SEQUENCE IF EXISTS migration_log_log_id_seq;
CREATE SEQUENCE migration_log_log_id_seq INCREMENT 1 MINVALUE 1 MAXVALUE 2147483647 CACHE 1;

CREATE TABLE "public"."migration_log" (
    "log_id" integer DEFAULT nextval('migration_log_log_id_seq') NOT NULL,
    "migration_version" character varying(20) NOT NULL,
    "step_name" character varying(200) NOT NULL,
    "step_description" text,
    "executed_at" timestamp DEFAULT CURRENT_TIMESTAMP,
    "status" character varying(20) DEFAULT 'SUCCESS',
    CONSTRAINT "migration_log_pkey" PRIMARY KEY ("log_id")
) WITH (oids = false);


DROP TABLE IF EXISTS "modification_assignments";
DROP SEQUENCE IF EXISTS modification_assignments_id_seq;
CREATE SEQUENCE modification_assignments_id_seq INCREMENT 1 MINVALUE 1 MAXVALUE 2147483647 CACHE 1;

CREATE TABLE "public"."modification_assignments" (
    "assignment_id" integer DEFAULT nextval('modification_assignments_id_seq') NOT NULL,
    "modification_id" integer NOT NULL,
    "assignment_type" character varying(30) NOT NULL,
    "assignor_name" character varying(200) NOT NULL,
    "assignor_id" character varying(50) NOT NULL,
    "assignor_id_type" character varying(10),
    "assignee_name" character varying(200) NOT NULL,
    "assignee_id" character varying(50) NOT NULL,
    "assignee_id_type" character varying(10),
    "supervisor_name" character varying(200),
    "supervisor_id" character varying(50),
    "assignment_date" date NOT NULL,
    "assignment_signature_date" date,
    "value_paid_to_assignor" numeric(15,2),
    "value_pending_to_assignor" numeric(15,2),
    "value_to_assign" numeric(15,2) NOT NULL,
    "handover_report_path" character varying(300),
    "technical_report_path" character varying(300),
    "account_statement_path" character varying(300),
    "cdp" character varying(100),
    "rp" character varying(100),
    "guarantee_modification_request" text,
    "related_derived_project_id" integer,
    "created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "created_by_user_id" integer,
    "is_active" boolean DEFAULT true NOT NULL,
    CONSTRAINT "pk_modification_assignments" PRIMARY KEY ("assignment_id"),
    CONSTRAINT "ck_assignment_type" CHECK (((assignment_type)::text = ANY ((ARRAY['CESION_CESIONARIA'::character varying, 'CESION_CEDENTE'::character varying])::text[])))
) WITH (oids = false);

COMMENT ON TABLE "public"."modification_assignments" IS 'Detalles de cesiones contractuales';

CREATE INDEX idx_assignments_modification ON public.modification_assignments USING btree (modification_id);

CREATE INDEX idx_assignments_type ON public.modification_assignments USING btree (assignment_type);


DROP TABLE IF EXISTS "modification_clause_changes";
DROP SEQUENCE IF EXISTS modification_clause_changes_id_seq;
CREATE SEQUENCE modification_clause_changes_id_seq INCREMENT 1 MINVALUE 1 MAXVALUE 2147483647 CACHE 1;

CREATE TABLE "public"."modification_clause_changes" (
    "clause_change_id" integer DEFAULT nextval('modification_clause_changes_id_seq') NOT NULL,
    "modification_id" integer NOT NULL,
    "clause_number" character varying(20) NOT NULL,
    "clause_name" character varying(200) NOT NULL,
    "original_clause_text" text,
    "new_clause_text" text NOT NULL,
    "requires_resource_liberation" boolean DEFAULT false,
    "cdp_to_release" character varying(100),
    "rp_to_release" character varying(100),
    "liberation_amount" numeric(15,2),
    "created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "created_by_user_id" integer,
    "is_active" boolean DEFAULT true NOT NULL,
    "modification_description" text,
    CONSTRAINT "pk_modification_clause_changes" PRIMARY KEY ("clause_change_id")
) WITH (oids = false);

COMMENT ON TABLE "public"."modification_clause_changes" IS 'Modificaciones de cláusulas contractuales';

CREATE INDEX idx_clause_changes_modification ON public.modification_clause_changes USING btree (modification_id);


DROP TABLE IF EXISTS "modification_documents";
DROP SEQUENCE IF EXISTS modification_documents_id_seq;
CREATE SEQUENCE modification_documents_id_seq INCREMENT 1 MINVALUE 1 MAXVALUE 2147483647 CACHE 1;

CREATE TABLE "public"."modification_documents" (
    "mod_document_id" integer DEFAULT nextval('modification_documents_id_seq') NOT NULL,
    "modification_id" integer NOT NULL,
    "document_id" integer NOT NULL,
    "document_role" character varying(50),
    "attached_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "attached_by_user_id" integer,
    "is_active" boolean DEFAULT true NOT NULL,
    CONSTRAINT "pk_modification_documents" PRIMARY KEY ("mod_document_id")
) WITH (oids = false);

COMMENT ON TABLE "public"."modification_documents" IS 'Documentos adjuntos a modificaciones';

CREATE UNIQUE INDEX uk_mod_docs_unique ON public.modification_documents USING btree (modification_id, document_id);

CREATE INDEX idx_mod_docs_modification ON public.modification_documents USING btree (modification_id);

CREATE INDEX idx_mod_docs_document ON public.modification_documents USING btree (document_id);


DROP TABLE IF EXISTS "modification_liquidations";
DROP SEQUENCE IF EXISTS modification_liquidations_id_seq;
CREATE SEQUENCE modification_liquidations_id_seq INCREMENT 1 MINVALUE 1 MAXVALUE 2147483647 CACHE 1;

CREATE TABLE "public"."modification_liquidations" (
    "liquidation_id" integer DEFAULT nextval('modification_liquidations_id_seq') NOT NULL,
    "modification_id" integer NOT NULL,
    "liquidation_type" character varying(20) NOT NULL,
    "resolution_number" character varying(50),
    "resolution_date" date,
    "unilateral_cause" text,
    "cause_analysis" text,
    "initial_contract_value" numeric(15,2) NOT NULL,
    "final_value_with_additions" numeric(15,2) NOT NULL,
    "execution_percentage" numeric(5,2) NOT NULL,
    "executed_value" numeric(15,2) NOT NULL,
    "pending_payment_value" numeric(15,2),
    "value_to_release" numeric(15,2),
    "cdp" character varying(100),
    "cdp_value" numeric(15,2),
    "rp" character varying(100),
    "rp_value" numeric(15,2),
    "suspensions_summary" jsonb,
    "extensions_summary" jsonb,
    "additions_summary" jsonb,
    "liquidation_date" date NOT NULL,
    "liquidation_signature_date" date,
    "supervisor_liquidation_request" text NOT NULL,
    "created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "created_by_user_id" integer,
    "is_active" boolean DEFAULT true NOT NULL,
    CONSTRAINT "pk_modification_liquidations" PRIMARY KEY ("liquidation_id"),
    CONSTRAINT "ck_liquidation_type" CHECK (((liquidation_type)::text = ANY ((ARRAY['BILATERAL'::character varying, 'UNILATERAL'::character varying])::text[]))),
    CONSTRAINT "ck_liquidation_percentage" CHECK (((execution_percentage >= (0)::numeric) AND (execution_percentage <= (100)::numeric))),
    CONSTRAINT "ck_unilateral_resolution" CHECK (((((liquidation_type)::text = 'UNILATERAL'::text) AND (resolution_number IS NOT NULL) AND (unilateral_cause IS NOT NULL)) OR ((liquidation_type)::text = 'BILATERAL'::text)))
) WITH (oids = false);

COMMENT ON TABLE "public"."modification_liquidations" IS 'Detalles de liquidaciones contractuales';

CREATE INDEX idx_liquidations_modification ON public.modification_liquidations USING btree (modification_id);

CREATE INDEX idx_liquidations_type ON public.modification_liquidations USING btree (liquidation_type);


DROP TABLE IF EXISTS "modification_suspensions";
DROP SEQUENCE IF EXISTS modification_suspensions_id_seq;
CREATE SEQUENCE modification_suspensions_id_seq INCREMENT 1 MINVALUE 1 MAXVALUE 2147483647 CACHE 1;

CREATE TABLE "public"."modification_suspensions" (
    "suspension_id" integer DEFAULT nextval('modification_suspensions_id_seq') NOT NULL,
    "modification_id" integer NOT NULL,
    "suspension_start_date" date NOT NULL,
    "suspension_end_date" date NOT NULL,
    "planned_restart_date" date NOT NULL,
    "actual_restart_date" date,
    "contractor_justification" text NOT NULL,
    "supervisor_justification" text NOT NULL,
    "entity_supervisor_name" character varying(200),
    "entity_supervisor_id" character varying(50),
    "entity_supervisor_signature_date" date,
    "suspension_status" character varying(20) DEFAULT 'ACTIVE',
    "restart_modification_id" integer,
    "created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "created_by_user_id" integer,
    "is_active" boolean DEFAULT true NOT NULL,
    CONSTRAINT "pk_modification_suspensions" PRIMARY KEY ("suspension_id"),
    CONSTRAINT "ck_suspension_dates" CHECK ((suspension_end_date >= suspension_start_date)),
    CONSTRAINT "ck_suspension_status" CHECK (((suspension_status)::text = ANY ((ARRAY['ACTIVE'::character varying, 'RESTARTED'::character varying, 'CANCELLED'::character varying])::text[])))
) WITH (oids = false);

COMMENT ON TABLE "public"."modification_suspensions" IS 'Detalles de suspensiones y reinicios';

CREATE INDEX idx_suspensions_modification ON public.modification_suspensions USING btree (modification_id);

CREATE INDEX idx_suspensions_status ON public.modification_suspensions USING btree (suspension_status);


DROP TABLE IF EXISTS "ordering_officials";
DROP SEQUENCE IF EXISTS ordering_officials_id_seq;
CREATE SEQUENCE ordering_officials_id_seq INCREMENT 1 MINVALUE 1 MAXVALUE 2147483647 CACHE 1;

CREATE TABLE "public"."ordering_officials" (
    "official_id" integer DEFAULT nextval('ordering_officials_id_seq') NOT NULL,
    "first_name" character varying(50) NOT NULL,
    "second_name" character varying(50),
    "first_surname" character varying(50) NOT NULL,
    "second_surname" character varying(50),
    "identification_type" character varying(10) NOT NULL,
    "identification_number" character varying(20) NOT NULL,
    "appointment_resolution" character varying(50),
    "resolution_date" date,
    "institutional_email" character varying(200),
    "phone" character varying(50),
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "created_by_user_id" integer,
    "updated_at" timestamp,
    "updated_by_user_id" integer,
    CONSTRAINT "pk_ordering_officials" PRIMARY KEY ("official_id"),
    CONSTRAINT "ck_ordering_officials_id_type" CHECK (((identification_type)::text = ANY ((ARRAY['CC'::character varying, 'CE'::character varying, 'TI'::character varying, 'PP'::character varying, 'NIT'::character varying])::text[])))
) WITH (oids = false);

COMMENT ON TABLE "public"."ordering_officials" IS 'Officials authorized to order expenditures';

CREATE UNIQUE INDEX uk_ordering_officials_identification ON public.ordering_officials USING btree (identification_type, identification_number);

CREATE INDEX idx_ordering_officials_active ON public.ordering_officials USING btree (is_active);


DROP TABLE IF EXISTS "project_document_types";
DROP SEQUENCE IF EXISTS project_document_types_id_seq;
CREATE SEQUENCE project_document_types_id_seq INCREMENT 1 MINVALUE 1 MAXVALUE 2147483647 CACHE 1;

CREATE TABLE "public"."project_document_types" (
    "document_type_id" integer DEFAULT nextval('project_document_types_id_seq') NOT NULL,
    "type_code" character varying(10) NOT NULL,
    "type_name" character varying(100) NOT NULL,
    "type_description" text,
    "is_active" boolean DEFAULT true NOT NULL,
    CONSTRAINT "pk_project_document_types" PRIMARY KEY ("document_type_id")
) WITH (oids = false);

COMMENT ON TABLE "public"."project_document_types" IS 'Catalog of document types for projects';

CREATE UNIQUE INDEX uk_project_document_types_code ON public.project_document_types USING btree (type_code);

CREATE UNIQUE INDEX uk_project_document_types_name ON public.project_document_types USING btree (type_name);


DROP TABLE IF EXISTS "project_documents";
DROP SEQUENCE IF EXISTS project_documents_id_seq;
CREATE SEQUENCE project_documents_id_seq INCREMENT 1 MINVALUE 1 MAXVALUE 2147483647 CACHE 1;

CREATE TABLE "public"."project_documents" (
    "document_id" integer DEFAULT nextval('project_documents_id_seq') NOT NULL,
    "project_year" smallint NOT NULL,
    "internal_project_number" smallint NOT NULL,
    "document_number" integer NOT NULL,
    "document_type_id" integer NOT NULL,
    "document_name" character varying(200) NOT NULL,
    "document_description" text,
    "document_date" date,
    "file_path" character varying(300),
    "original_filename" character varying(200),
    "file_extension" character varying(10),
    "file_size" integer,
    "is_minutes" boolean DEFAULT false,
    "minutes_number" integer,
    "document_status" character varying(20) DEFAULT 'ACTIVE',
    "signature_date" date,
    "document_version" smallint DEFAULT '1',
    "observations" text,
    "is_confidential" boolean DEFAULT false,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "created_by_user_id" integer,
    "updated_at" timestamp,
    "updated_by_user_id" integer,
    CONSTRAINT "pk_project_documents" PRIMARY KEY ("document_id"),
    CONSTRAINT "ck_documents_file_size" CHECK (((file_size IS NULL) OR (file_size > 0)))
) WITH (oids = false);

COMMENT ON TABLE "public"."project_documents" IS 'Documents attached to projects';

COMMENT ON COLUMN "public"."project_documents"."is_minutes" IS 'Indicates if the document is meeting minutes';

COMMENT ON COLUMN "public"."project_documents"."is_confidential" IS 'Indicates if the document is confidential';

CREATE INDEX idx_documents_year ON public.project_documents USING btree (project_year);

CREATE INDEX idx_documents_type ON public.project_documents USING btree (document_type_id);

CREATE INDEX idx_documents_date ON public.project_documents USING btree (document_date);


DROP TABLE IF EXISTS "project_modifications";
DROP SEQUENCE IF EXISTS project_modifications_id_seq;
CREATE SEQUENCE project_modifications_id_seq INCREMENT 1 MINVALUE 1 MAXVALUE 2147483647 CACHE 1;

CREATE TABLE "public"."project_modifications" (
    "modification_id" integer DEFAULT nextval('project_modifications_id_seq') NOT NULL,
    "project_id" integer NOT NULL,
    "modification_number" smallint NOT NULL,
    "modification_type" character varying(20) NOT NULL,
    "addition_value" numeric(15,2),
    "extension_days" integer,
    "new_end_date" date,
    "new_total_value" numeric(15,2),
    "justification" text,
    "administrative_act" character varying(50),
    "approval_date" date,
    "created_by_user_id" integer,
    "created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "extension_period_text" character varying(200),
    "cdp" character varying(100),
    "cdp_value" numeric(15,2),
    "rp" character varying(100),
    "rp_value" numeric(15,2),
    "requires_policy_update" boolean DEFAULT false,
    "policy_update_description" text,
    "payment_method_modification" text,
    "updated_at" timestamp,
    "updated_by_user_id" integer,
    "ordering_official_id" integer,
    CONSTRAINT "pk_project_modifications" PRIMARY KEY ("modification_id"),
    CONSTRAINT "ck_modifications_type" CHECK (((modification_type)::text = ANY ((ARRAY['ADDITION'::character varying, 'EXTENSION'::character varying, 'BOTH'::character varying, 'CONTRACTUAL'::character varying, 'SUSPENSION'::character varying, 'RESTART'::character varying, 'CESION_CESIONARIA'::character varying, 'CESION_CEDENTE'::character varying, 'LIQUIDATION'::character varying])::text[])))
) WITH (oids = false);

COMMENT ON TABLE "public"."project_modifications" IS 'Modifications to projects (budget additions, time extensions)';

COMMENT ON COLUMN "public"."project_modifications"."modification_type" IS 'Tipo: EXTENSION, ADDITION, BOTH, MODIFICATION, SCOPE, SUSPENSION, RESTART, ASSIGNMENT, LIQUIDATION';

COMMENT ON COLUMN "public"."project_modifications"."extension_period_text" IS 'Descripción textual del período: ej. CINCO (5) MESES Y VEINTITRES (23) DÍAS';

COMMENT ON COLUMN "public"."project_modifications"."cdp" IS 'Certificado de Disponibilidad Presupuestal';

COMMENT ON COLUMN "public"."project_modifications"."rp" IS 'Registro Presupuestal';

COMMENT ON COLUMN "public"."project_modifications"."ordering_official_id" IS 'Funcionario ordenador del gasto (Jefe Extensión o Rector) - FK a ordering_officials';

CREATE INDEX idx_modifications_project ON public.project_modifications USING btree (project_id);

CREATE INDEX idx_modifications_date ON public.project_modifications USING btree (approval_date);

CREATE INDEX idx_modifications_type ON public.project_modifications USING btree (modification_type);

CREATE INDEX idx_modifications_cdp ON public.project_modifications USING btree (cdp) WHERE (cdp IS NOT NULL);

CREATE INDEX idx_modifications_ordering_official ON public.project_modifications USING btree (ordering_official_id) WHERE (ordering_official_id IS NOT NULL);


DROP TABLE IF EXISTS "project_rup_codes";
DROP SEQUENCE IF EXISTS project_rup_codes_id_seq;
CREATE SEQUENCE project_rup_codes_id_seq INCREMENT 1 MINVALUE 1 MAXVALUE 2147483647 CACHE 1;

CREATE TABLE "public"."project_rup_codes" (
    "project_rup_code_id" integer DEFAULT nextval('project_rup_codes_id_seq') NOT NULL,
    "project_year" smallint NOT NULL,
    "internal_project_number" smallint NOT NULL,
    "rup_code_id" integer NOT NULL,
    "is_main_code" boolean DEFAULT false,
    "assignment_date" date,
    "assigned_by_user_id" integer,
    "is_active" boolean DEFAULT true NOT NULL,
    CONSTRAINT "pk_project_rup_codes" PRIMARY KEY ("project_rup_code_id")
) WITH (oids = false);

COMMENT ON TABLE "public"."project_rup_codes" IS 'RUP codes assigned to projects';

COMMENT ON COLUMN "public"."project_rup_codes"."is_main_code" IS 'Indicates if this is the primary RUP code for the project';

CREATE INDEX idx_project_rup_codes_year ON public.project_rup_codes USING btree (project_year);

CREATE INDEX idx_project_rup_codes_rup ON public.project_rup_codes USING btree (rup_code_id);


DROP TABLE IF EXISTS "project_secondary_emails";
DROP SEQUENCE IF EXISTS project_secondary_emails_id_seq;
CREATE SEQUENCE project_secondary_emails_id_seq INCREMENT 1 MINVALUE 1 MAXVALUE 2147483647 CACHE 1;

CREATE TABLE "public"."project_secondary_emails" (
    "secondary_email_id" integer DEFAULT nextval('project_secondary_emails_id_seq') NOT NULL,
    "project_id" integer NOT NULL,
    "email" character varying(200) NOT NULL,
    "contact_type" character varying(50),
    "contact_name" character varying(100),
    "contact_position" character varying(100),
    "contact_phone" character varying(20),
    "observations" text,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "created_by_user_id" integer,
    "updated_at" timestamp,
    "updated_by_user_id" integer,
    CONSTRAINT "pk_project_secondary_emails" PRIMARY KEY ("secondary_email_id")
) WITH (oids = false);

COMMENT ON TABLE "public"."project_secondary_emails" IS 'Additional contact emails for projects';

CREATE INDEX idx_secondary_emails_project ON public.project_secondary_emails USING btree (project_id);


DROP TABLE IF EXISTS "project_statuses";
DROP SEQUENCE IF EXISTS project_statuses_id_seq;
CREATE SEQUENCE project_statuses_id_seq INCREMENT 1 MINVALUE 1 MAXVALUE 2147483647 CACHE 1;

CREATE TABLE "public"."project_statuses" (
    "status_id" integer DEFAULT nextval('project_statuses_id_seq') NOT NULL,
    "status_code" character varying(10) NOT NULL,
    "status_name" character varying(100) NOT NULL,
    "status_color" character varying(7),
    "status_order" smallint DEFAULT '1',
    "status_description" text,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "created_by_user_id" integer,
    CONSTRAINT "pk_project_statuses" PRIMARY KEY ("status_id"),
    CONSTRAINT "ck_project_statuses_color" CHECK (((status_color)::text ~ '^#[0-9A-Fa-f]{6}$'::text))
) WITH (oids = false);

COMMENT ON TABLE "public"."project_statuses" IS 'Catalog of project statuses';

COMMENT ON COLUMN "public"."project_statuses"."status_color" IS 'Hexadecimal color code for UI display';

CREATE UNIQUE INDEX uk_project_statuses_code ON public.project_statuses USING btree (status_code);

CREATE UNIQUE INDEX uk_project_statuses_name ON public.project_statuses USING btree (status_name);


DROP TABLE IF EXISTS "project_types";
DROP SEQUENCE IF EXISTS project_types_id_seq;
CREATE SEQUENCE project_types_id_seq INCREMENT 1 MINVALUE 1 MAXVALUE 2147483647 CACHE 1;

CREATE TABLE "public"."project_types" (
    "project_type_id" integer DEFAULT nextval('project_types_id_seq') NOT NULL,
    "type_name" character varying(100) NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    CONSTRAINT "pk_project_types" PRIMARY KEY ("project_type_id")
) WITH (oids = false);

COMMENT ON TABLE "public"."project_types" IS 'Catalog of project types';

CREATE UNIQUE INDEX uk_project_types_name ON public.project_types USING btree (type_name);


DROP TABLE IF EXISTS "projects";
DROP SEQUENCE IF EXISTS projects_id_seq;
CREATE SEQUENCE projects_id_seq INCREMENT 1 MINVALUE 1 MAXVALUE 2147483647 CACHE 1;

CREATE TABLE "public"."projects" (
    "project_id" integer DEFAULT nextval('projects_id_seq') NOT NULL,
    "project_year" smallint NOT NULL,
    "internal_project_number" smallint NOT NULL,
    "external_project_number" character varying(20),
    "project_name" character varying(800) NOT NULL,
    "project_purpose" text NOT NULL,
    "entity_id" integer NOT NULL,
    "executing_department_id" integer NOT NULL,
    "project_status_id" integer NOT NULL,
    "project_type_id" integer NOT NULL,
    "financing_type_id" integer NOT NULL,
    "execution_modality_id" integer NOT NULL,
    "project_value" numeric(15,2) NOT NULL,
    "accounting_code" character varying(50),
    "institutional_benefit_percentage" numeric(5,2) DEFAULT '12.00',
    "institutional_benefit_value" numeric(15,2),
    "university_contribution" numeric(15,2) DEFAULT '0',
    "entity_contribution" numeric(15,2),
    "beneficiaries_count" integer,
    "subscription_date" date,
    "start_date" date NOT NULL,
    "end_date" date NOT NULL,
    "ordering_official_id" integer NOT NULL,
    "main_email" character varying(200),
    "administrative_act" character varying(50),
    "secop_link" character varying(1000),
    "observations" text,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "created_by_user_id" integer,
    "updated_at" timestamp,
    "updated_by_user_id" integer,
    "rup_codes_general_observations" text,
    "session_type" character varying(50),
    "minutes_date" date,
    "minutes_number" character varying(50),
    "supervisor_type" character varying(30) DEFAULT 'JEFE_EXTENSION',
    CONSTRAINT "pk_projects" PRIMARY KEY ("project_id"),
    CONSTRAINT "ck_projects_value_positive" CHECK ((project_value > (0)::numeric)),
    CONSTRAINT "ck_projects_dates_valid" CHECK ((end_date >= start_date)),
    CONSTRAINT "ck_projects_year_valid" CHECK (((project_year >= 2020) AND (project_year <= 2100))),
    CONSTRAINT "ck_projects_benefit_percentage" CHECK (((institutional_benefit_percentage >= (0)::numeric) AND (institutional_benefit_percentage <= (100)::numeric))),
    CONSTRAINT "ck_projects_contributions" CHECK (((university_contribution >= (0)::numeric) AND (entity_contribution >= (0)::numeric) AND ((university_contribution + entity_contribution) <= project_value))),
    CONSTRAINT "ck_projects_supervisor_type" CHECK (((supervisor_type)::text = ANY ((ARRAY['RECTOR'::character varying, 'JEFE_EXTENSION'::character varying])::text[])))
) WITH (oids = false);

COMMENT ON TABLE "public"."projects" IS 'Main projects table containing all project information';

COMMENT ON COLUMN "public"."projects"."project_value" IS 'Total value of the project in COP';

COMMENT ON COLUMN "public"."projects"."institutional_benefit_percentage" IS 'Percentage of institutional benefit (default 12%)';

COMMENT ON COLUMN "public"."projects"."secop_link" IS 'Link to SECOP (Colombian procurement system)';

COMMENT ON COLUMN "public"."projects"."rup_codes_general_observations" IS 'General observations for all RUP codes assigned to this project';

COMMENT ON COLUMN "public"."projects"."session_type" IS 'Tipo de sesión de aprobación (Ordinaria/Extraordinaria)';

COMMENT ON COLUMN "public"."projects"."minutes_date" IS 'Fecha del acta de aprobación';

COMMENT ON COLUMN "public"."projects"."minutes_number" IS 'Número del acta de aprobación';

COMMENT ON COLUMN "public"."projects"."supervisor_type" IS 'Tipo de supervisor del contrato: RECTOR o JEFE_EXTENSION';

CREATE UNIQUE INDEX uk_projects_year_number ON public.projects USING btree (project_year, internal_project_number);

CREATE INDEX idx_projects_status ON public.projects USING btree (project_status_id);

CREATE INDEX idx_projects_year ON public.projects USING btree (project_year);

CREATE INDEX idx_projects_entity ON public.projects USING btree (entity_id);

CREATE INDEX idx_projects_department ON public.projects USING btree (executing_department_id);

CREATE INDEX idx_projects_start_date ON public.projects USING btree (start_date);

CREATE INDEX idx_projects_end_date ON public.projects USING btree (end_date);

CREATE INDEX idx_projects_type ON public.projects USING btree (project_type_id);

CREATE INDEX idx_projects_active ON public.projects USING btree (is_active);

CREATE INDEX idx_projects_session_type ON public.projects USING btree (session_type);

CREATE INDEX idx_projects_minutes_date ON public.projects USING btree (minutes_date);

CREATE INDEX idx_projects_supervisor_type ON public.projects USING btree (supervisor_type);


DROP TABLE IF EXISTS "rup_codes";
DROP SEQUENCE IF EXISTS rup_codes_id_seq;
CREATE SEQUENCE rup_codes_id_seq INCREMENT 1 MINVALUE 1 MAXVALUE 2147483647 CACHE 1;

CREATE TABLE "public"."rup_codes" (
    "rup_code_id" integer DEFAULT nextval('rup_codes_id_seq') NOT NULL,
    "rup_code" character varying(20) NOT NULL,
    "code_description" text NOT NULL,
    "segment_code" character varying(10),
    "segment_name" character varying(200),
    "family_code" character varying(10),
    "family_name" character varying(200),
    "class_code" character varying(10),
    "class_name" character varying(200),
    "product_code" character varying(10),
    "product_name" character varying(200),
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "created_by_user_id" integer,
    CONSTRAINT "pk_rup_codes" PRIMARY KEY ("rup_code_id")
) WITH (oids = false);

COMMENT ON TABLE "public"."rup_codes" IS 'Clasificador de Bienes y Servicios UNSPSC v14 - Jerarquía completa';

COMMENT ON COLUMN "public"."rup_codes"."rup_code" IS 'Código UNSPSC de 8 dígitos (nivel PRODUCTO)';

COMMENT ON COLUMN "public"."rup_codes"."segment_code" IS 'Código de segmento (2 dígitos)';

COMMENT ON COLUMN "public"."rup_codes"."family_code" IS 'Código de familia (4 dígitos)';

COMMENT ON COLUMN "public"."rup_codes"."class_code" IS 'Código de clase (6 dígitos)';

COMMENT ON COLUMN "public"."rup_codes"."product_code" IS 'Código de producto (8 dígitos)';

CREATE UNIQUE INDEX uk_rup_codes_code ON public.rup_codes USING btree (rup_code);

CREATE INDEX idx_rup_codes_segment ON public.rup_codes USING btree (segment_code);

CREATE INDEX idx_rup_codes_family ON public.rup_codes USING btree (family_code);

CREATE INDEX idx_rup_codes_class ON public.rup_codes USING btree (class_code);

CREATE INDEX idx_rup_codes_product ON public.rup_codes USING btree (product_code);

CREATE INDEX idx_rup_codes_active ON public.rup_codes USING btree (is_active);


ALTER TABLE ONLY "public"."entities" ADD CONSTRAINT "fk_entities_entity_types" FOREIGN KEY (entity_type_id) REFERENCES entity_types(entity_type_id) NOT DEFERRABLE;

ALTER TABLE ONLY "public"."modification_assignments" ADD CONSTRAINT "fk_assignments_derived_project" FOREIGN KEY (related_derived_project_id) REFERENCES projects(project_id) ON DELETE SET NULL NOT DEFERRABLE;
ALTER TABLE ONLY "public"."modification_assignments" ADD CONSTRAINT "fk_assignments_modifications" FOREIGN KEY (modification_id) REFERENCES project_modifications(modification_id) ON DELETE CASCADE NOT DEFERRABLE;

ALTER TABLE ONLY "public"."modification_clause_changes" ADD CONSTRAINT "fk_clause_changes_modifications" FOREIGN KEY (modification_id) REFERENCES project_modifications(modification_id) ON DELETE CASCADE NOT DEFERRABLE;

ALTER TABLE ONLY "public"."modification_documents" ADD CONSTRAINT "fk_mod_docs_documents" FOREIGN KEY (document_id) REFERENCES project_documents(document_id) ON DELETE CASCADE NOT DEFERRABLE;
ALTER TABLE ONLY "public"."modification_documents" ADD CONSTRAINT "fk_mod_docs_modifications" FOREIGN KEY (modification_id) REFERENCES project_modifications(modification_id) ON DELETE CASCADE NOT DEFERRABLE;

ALTER TABLE ONLY "public"."modification_liquidations" ADD CONSTRAINT "fk_liquidations_modifications" FOREIGN KEY (modification_id) REFERENCES project_modifications(modification_id) ON DELETE CASCADE NOT DEFERRABLE;

ALTER TABLE ONLY "public"."modification_suspensions" ADD CONSTRAINT "fk_suspensions_modifications" FOREIGN KEY (modification_id) REFERENCES project_modifications(modification_id) ON DELETE CASCADE NOT DEFERRABLE;
ALTER TABLE ONLY "public"."modification_suspensions" ADD CONSTRAINT "fk_suspensions_restart_mod" FOREIGN KEY (restart_modification_id) REFERENCES project_modifications(modification_id) ON DELETE SET NULL NOT DEFERRABLE;

ALTER TABLE ONLY "public"."project_documents" ADD CONSTRAINT "fk_documents_document_types" FOREIGN KEY (document_type_id) REFERENCES project_document_types(document_type_id) NOT DEFERRABLE;

ALTER TABLE ONLY "public"."project_modifications" ADD CONSTRAINT "fk_modifications_ordering_official" FOREIGN KEY (ordering_official_id) REFERENCES ordering_officials(official_id) NOT DEFERRABLE;
ALTER TABLE ONLY "public"."project_modifications" ADD CONSTRAINT "fk_modifications_projects" FOREIGN KEY (project_id) REFERENCES projects(project_id) ON DELETE CASCADE NOT DEFERRABLE;

ALTER TABLE ONLY "public"."project_secondary_emails" ADD CONSTRAINT "fk_secondary_emails_projects" FOREIGN KEY (project_id) REFERENCES projects(project_id) ON DELETE CASCADE NOT DEFERRABLE;

ALTER TABLE ONLY "public"."projects" ADD CONSTRAINT "fk_projects_departments" FOREIGN KEY (executing_department_id) REFERENCES executing_departments(department_id) NOT DEFERRABLE;
ALTER TABLE ONLY "public"."projects" ADD CONSTRAINT "fk_projects_entities" FOREIGN KEY (entity_id) REFERENCES entities(entity_id) NOT DEFERRABLE;
ALTER TABLE ONLY "public"."projects" ADD CONSTRAINT "fk_projects_execution_modalities" FOREIGN KEY (execution_modality_id) REFERENCES execution_modalities(execution_modality_id) NOT DEFERRABLE;
ALTER TABLE ONLY "public"."projects" ADD CONSTRAINT "fk_projects_financing_types" FOREIGN KEY (financing_type_id) REFERENCES financing_types(financing_type_id) NOT DEFERRABLE;
ALTER TABLE ONLY "public"."projects" ADD CONSTRAINT "fk_projects_ordering_officials" FOREIGN KEY (ordering_official_id) REFERENCES ordering_officials(official_id) NOT DEFERRABLE;
ALTER TABLE ONLY "public"."projects" ADD CONSTRAINT "fk_projects_project_types" FOREIGN KEY (project_type_id) REFERENCES project_types(project_type_id) NOT DEFERRABLE;
ALTER TABLE ONLY "public"."projects" ADD CONSTRAINT "fk_projects_statuses" FOREIGN KEY (project_status_id) REFERENCES project_statuses(status_id) NOT DEFERRABLE;

-- 2026-03-04 16:45:57 UTC

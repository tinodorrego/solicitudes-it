CREATE TYPE "public"."estado" AS ENUM('PENDIENTE_APROBACION', 'NUEVA', 'ASIGNADA', 'EN_PROGRESO', 'RESUELTA', 'CERRADA', 'RECHAZADA', 'CANCELADA');--> statement-breakpoint
CREATE TYPE "public"."nivel" AS ENUM('ALTO', 'MEDIO', 'BAJO');--> statement-breakpoint
CREATE TYPE "public"."prioridad" AS ENUM('CRITICA', 'ALTA', 'MEDIA', 'BAJA');--> statement-breakpoint
CREATE TYPE "public"."rol" AS ENUM('SOLICITANTE', 'AGENTE', 'APROBADOR');--> statement-breakpoint
CREATE TABLE "categorias" (
	"id" serial PRIMARY KEY NOT NULL,
	"nombre" varchar(80) NOT NULL,
	"requiere_aprobacion" boolean DEFAULT false NOT NULL,
	CONSTRAINT "categorias_nombre_unique" UNIQUE("nombre")
);
--> statement-breakpoint
CREATE TABLE "historial_estados" (
	"id" serial PRIMARY KEY NOT NULL,
	"solicitud_id" integer NOT NULL,
	"estado_anterior" "estado",
	"estado_nuevo" "estado" NOT NULL,
	"usuario_id" integer NOT NULL,
	"motivo" text,
	"ocurrido_en" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "solicitudes" (
	"id" serial PRIMARY KEY NOT NULL,
	"titulo" varchar(120) NOT NULL,
	"descripcion" text NOT NULL,
	"categoria_id" integer NOT NULL,
	"solicitante_id" integer NOT NULL,
	"asignado_id" integer,
	"impacto" "nivel" NOT NULL,
	"urgencia" "nivel" NOT NULL,
	"prioridad" "prioridad" NOT NULL,
	"estado" "estado" NOT NULL,
	"creada_en" timestamp with time zone NOT NULL,
	"inicio_sla" timestamp with time zone,
	"vence_en" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "usuarios" (
	"id" serial PRIMARY KEY NOT NULL,
	"nombre" varchar(120) NOT NULL,
	"email" varchar(160) NOT NULL,
	"area" varchar(80) NOT NULL,
	"rol" "rol" NOT NULL,
	CONSTRAINT "usuarios_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "historial_estados" ADD CONSTRAINT "historial_estados_solicitud_id_solicitudes_id_fk" FOREIGN KEY ("solicitud_id") REFERENCES "public"."solicitudes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "historial_estados" ADD CONSTRAINT "historial_estados_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "solicitudes" ADD CONSTRAINT "solicitudes_categoria_id_categorias_id_fk" FOREIGN KEY ("categoria_id") REFERENCES "public"."categorias"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "solicitudes" ADD CONSTRAINT "solicitudes_solicitante_id_usuarios_id_fk" FOREIGN KEY ("solicitante_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "solicitudes" ADD CONSTRAINT "solicitudes_asignado_id_usuarios_id_fk" FOREIGN KEY ("asignado_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "historial_solicitud_idx" ON "historial_estados" USING btree ("solicitud_id");--> statement-breakpoint
CREATE INDEX "solicitudes_estado_idx" ON "solicitudes" USING btree ("estado");--> statement-breakpoint
CREATE INDEX "solicitudes_vence_idx" ON "solicitudes" USING btree ("vence_en");
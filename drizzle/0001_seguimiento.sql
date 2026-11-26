CREATE TYPE "public"."tipo_comentario" AS ENUM('COMENTARIO', 'EDICION');--> statement-breakpoint
CREATE TABLE "comentarios" (
	"id" serial PRIMARY KEY NOT NULL,
	"solicitud_id" integer NOT NULL,
	"usuario_id" integer NOT NULL,
	"tipo" "tipo_comentario" DEFAULT 'COMENTARIO' NOT NULL,
	"texto" text NOT NULL,
	"creado_en" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "solicitudes" ADD COLUMN "resuelta_en" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "comentarios" ADD CONSTRAINT "comentarios_solicitud_id_solicitudes_id_fk" FOREIGN KEY ("solicitud_id") REFERENCES "public"."solicitudes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comentarios" ADD CONSTRAINT "comentarios_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "comentarios_solicitud_idx" ON "comentarios" USING btree ("solicitud_id");
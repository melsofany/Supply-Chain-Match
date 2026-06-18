CREATE TABLE "customers" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"contact_name" text,
	"email" text,
	"phone" text,
	"address" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "supplier_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"color" text DEFAULT '#6366f1' NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "suppliers" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"contact_name" text,
	"email" text,
	"phone" text,
	"address" text,
	"category" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inquiries" (
	"id" serial PRIMARY KEY NOT NULL,
	"customer_id" integer NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'new' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inquiry_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"inquiry_id" integer NOT NULL,
	"description" text NOT NULL,
	"quantity" numeric(12, 3) NOT NULL,
	"unit" text,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "quotation_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"quotation_id" integer NOT NULL,
	"supplier_id" integer,
	"description" text NOT NULL,
	"quantity" numeric(12, 3) NOT NULL,
	"unit" text,
	"unit_price" numeric(15, 2) NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "quotations" (
	"id" serial PRIMARY KEY NOT NULL,
	"inquiry_id" integer NOT NULL,
	"customer_id" integer NOT NULL,
	"quotation_number" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"total_amount" numeric(15, 2),
	"valid_until" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer_pos" (
	"id" serial PRIMARY KEY NOT NULL,
	"customer_id" integer NOT NULL,
	"quotation_id" integer,
	"po_number" text,
	"status" text DEFAULT 'received' NOT NULL,
	"total_amount" numeric(15, 2),
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "supplier_pos" (
	"id" serial PRIMARY KEY NOT NULL,
	"supplier_id" integer NOT NULL,
	"customer_po_id" integer,
	"po_number" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"total_amount" numeric(15, 2),
	"insurance_rate" numeric(6, 4) DEFAULT '0.03' NOT NULL,
	"vat_rate" numeric(6, 4) DEFAULT '0.14' NOT NULL,
	"withholding_tax_rate" numeric(6, 4) DEFAULT '0.005' NOT NULL,
	"stamp_duty_rate" numeric(6, 4) DEFAULT '0.001' NOT NULL,
	"operating_cost" numeric(15, 2) DEFAULT '0' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "item_price_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"item_description" text NOT NULL,
	"supplier_id" integer,
	"customer_id" integer,
	"quotation_id" integer,
	"unit_price" numeric(15, 2) NOT NULL,
	"quantity" numeric(12, 3),
	"unit" text,
	"resulted_in_po" boolean DEFAULT false NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "supplier_rfq_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"rfq_id" integer NOT NULL,
	"inquiry_item_id" integer NOT NULL,
	"quoted_price" numeric(15, 2),
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "supplier_rfqs" (
	"id" serial PRIMARY KEY NOT NULL,
	"inquiry_id" integer NOT NULL,
	"supplier_id" integer NOT NULL,
	"rfq_number" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"quoted_price" numeric(15, 2),
	"notes" text,
	"token" text,
	"email_status" text DEFAULT 'not_sent',
	"email_sent_at" timestamp with time zone,
	"close_date" text,
	"link_opened" boolean DEFAULT false NOT NULL,
	"open_count" integer DEFAULT 0 NOT NULL,
	"first_opened_at" timestamp with time zone,
	"last_opened_at" timestamp with time zone,
	"offer_submitted" boolean DEFAULT false NOT NULL,
	"offer_submitted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "supplier_rfqs_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "delivery_notes" (
	"id" serial PRIMARY KEY NOT NULL,
	"dn_number" text NOT NULL,
	"customer_po_id" integer NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"issue_date" text,
	"signed_file_url" text,
	"notes" text,
	"finance_approved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "delivery_notes_dn_number_unique" UNIQUE("dn_number")
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" serial PRIMARY KEY NOT NULL,
	"invoice_number" text NOT NULL,
	"delivery_note_id" integer NOT NULL,
	"customer_po_id" integer NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"issue_date" text,
	"total_amount" numeric(15, 2),
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "invoices_invoice_number_unique" UNIQUE("invoice_number"),
	CONSTRAINT "invoices_delivery_note_id_unique" UNIQUE("delivery_note_id")
);
--> statement-breakpoint
CREATE TABLE "role_permissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"role_id" integer NOT NULL,
	"module" text NOT NULL,
	"can_view" boolean DEFAULT false NOT NULL,
	"can_create" boolean DEFAULT false NOT NULL,
	"can_edit" boolean DEFAULT false NOT NULL,
	"can_delete" boolean DEFAULT false NOT NULL,
	"can_approve" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"label" text NOT NULL,
	"is_system" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "roles_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"name" text NOT NULL,
	"role_id" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);

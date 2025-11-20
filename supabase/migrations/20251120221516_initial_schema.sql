
  create table "public"."entries" (
    "user_id" uuid not null default auth.uid(),
    "entry" json
      );


alter table "public"."entries" enable row level security;


  create table "public"."profiles" (
    "username" text not null default 'Anonymous'::text,
    "email" text not null,
    "visibility" boolean default true,
    "pfp_url" text default 'temp-pfp.png'::text,
    "user_id" uuid not null,
    "bio" text default 'no bio yet'::text
      );


alter table "public"."profiles" enable row level security;

CREATE UNIQUE INDEX entries_pkey ON public.entries USING btree (user_id);

CREATE UNIQUE INDEX profiles_pkey ON public.profiles USING btree (user_id);

CREATE UNIQUE INDEX "profiles_user ID_key" ON public.profiles USING btree (user_id);

alter table "public"."entries" add constraint "entries_pkey" PRIMARY KEY using index "entries_pkey";

alter table "public"."profiles" add constraint "profiles_pkey" PRIMARY KEY using index "profiles_pkey";

alter table "public"."profiles" add constraint "profiles_user ID_key" UNIQUE using index "profiles_user ID_key";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.append_entry(_entry json)
 RETURNS TABLE(id uuid)
 LANGUAGE plpgsql
AS $function$
DECLARE
  uid uuid := auth.uid()::uuid;
  existing json;
BEGIN
  -- Try to read existing entry for user
  SELECT entry INTO existing FROM public.entries WHERE user_id = uid;

  IF NOT FOUND OR existing IS NULL THEN
    -- No row exists: insert a new row with an array containing the entry
    INSERT INTO public.entries (user_id, entry) VALUES (uid, json_build_array(_entry)) RETURNING id INTO id;
    RETURN NEXT;
    RETURN;
  END IF;

  -- If existing is an array, append; otherwise create an array with existing + new
  IF json_typeof(existing) = 'array' THEN
    UPDATE public.entries
    SET entry = (existing::jsonb || jsonb_build_array(_entry))::json
    WHERE user_id = uid
    RETURNING id INTO id;
  ELSE
    UPDATE public.entries
    SET entry = json_build_array(existing, _entry)
    WHERE user_id = uid
    RETURNING id INTO id;
  END IF;

  RETURN NEXT;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- Run the insert inside its own protected block so a failure here
  -- doesn't abort the auth.users INSERT transaction.
  BEGIN
    INSERT INTO public.profiles (user_id, username, visibility, pfp_url)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta->>'username', split_part(NEW.email, '@', 1)),
      NEW.email,
      TRUE,
      NULL,
      now()
    )
    ON CONFLICT (id) DO NOTHING;
  EXCEPTION WHEN others THEN
    -- Log a NOTICE (won't stop the auth insert). You can examine DB logs for details.
    RAISE NOTICE 'handle_new_auth_user: could not create profile for user %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.insert_entry(_entry json)
 RETURNS TABLE(id uuid)
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  INSERT INTO public.entries (user_id, entry)
  VALUES (auth.uid()::uuid, _entry)
  RETURNING id;
END;
$function$
;

grant delete on table "public"."entries" to "anon";

grant insert on table "public"."entries" to "anon";

grant references on table "public"."entries" to "anon";

grant select on table "public"."entries" to "anon";

grant trigger on table "public"."entries" to "anon";

grant truncate on table "public"."entries" to "anon";

grant update on table "public"."entries" to "anon";

grant delete on table "public"."entries" to "authenticated";

grant insert on table "public"."entries" to "authenticated";

grant references on table "public"."entries" to "authenticated";

grant select on table "public"."entries" to "authenticated";

grant trigger on table "public"."entries" to "authenticated";

grant truncate on table "public"."entries" to "authenticated";

grant update on table "public"."entries" to "authenticated";

grant delete on table "public"."entries" to "postgres";

grant insert on table "public"."entries" to "postgres";

grant references on table "public"."entries" to "postgres";

grant select on table "public"."entries" to "postgres";

grant trigger on table "public"."entries" to "postgres";

grant truncate on table "public"."entries" to "postgres";

grant update on table "public"."entries" to "postgres";

grant delete on table "public"."entries" to "service_role";

grant insert on table "public"."entries" to "service_role";

grant references on table "public"."entries" to "service_role";

grant select on table "public"."entries" to "service_role";

grant trigger on table "public"."entries" to "service_role";

grant truncate on table "public"."entries" to "service_role";

grant update on table "public"."entries" to "service_role";

grant delete on table "public"."profiles" to "anon";

grant insert on table "public"."profiles" to "anon";

grant references on table "public"."profiles" to "anon";

grant select on table "public"."profiles" to "anon";

grant trigger on table "public"."profiles" to "anon";

grant truncate on table "public"."profiles" to "anon";

grant update on table "public"."profiles" to "anon";

grant delete on table "public"."profiles" to "authenticated";

grant insert on table "public"."profiles" to "authenticated";

grant references on table "public"."profiles" to "authenticated";

grant select on table "public"."profiles" to "authenticated";

grant trigger on table "public"."profiles" to "authenticated";

grant truncate on table "public"."profiles" to "authenticated";

grant update on table "public"."profiles" to "authenticated";

grant delete on table "public"."profiles" to "postgres";

grant insert on table "public"."profiles" to "postgres";

grant references on table "public"."profiles" to "postgres";

grant select on table "public"."profiles" to "postgres";

grant trigger on table "public"."profiles" to "postgres";

grant truncate on table "public"."profiles" to "postgres";

grant update on table "public"."profiles" to "postgres";

grant delete on table "public"."profiles" to "service_role";

grant insert on table "public"."profiles" to "service_role";

grant references on table "public"."profiles" to "service_role";

grant select on table "public"."profiles" to "service_role";

grant trigger on table "public"."profiles" to "service_role";

grant truncate on table "public"."profiles" to "service_role";

grant update on table "public"."profiles" to "service_role";


  create policy "Entries: owner delete"
  on "public"."entries"
  as permissive
  for delete
  to public
using ((user_id = auth.uid()));



  create policy "Entries: owner insert"
  on "public"."entries"
  as permissive
  for insert
  to public
with check ((user_id = auth.uid()));



  create policy "Entries: owner select"
  on "public"."entries"
  as permissive
  for select
  to public
using ((user_id = auth.uid()));



  create policy "Entries: owner update"
  on "public"."entries"
  as permissive
  for update
  to public
using ((user_id = auth.uid()))
with check ((user_id = auth.uid()));



  create policy "Profiles: owner delete"
  on "public"."profiles"
  as permissive
  for delete
  to public
using ((user_id = auth.uid()));



  create policy "Profiles: owner insert"
  on "public"."profiles"
  as permissive
  for insert
  to public
with check ((user_id = auth.uid()));



  create policy "Profiles: owner select"
  on "public"."profiles"
  as permissive
  for select
  to public
using ((user_id = auth.uid()));



  create policy "Profiles: owner update"
  on "public"."profiles"
  as permissive
  for update
  to public
using ((user_id = auth.uid()))
with check ((user_id = auth.uid()));




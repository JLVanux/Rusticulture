# Planificateur des notifications

## Pourquoi pas GitHub Actions

Les tâches planifiées de GitHub accusent couramment **dix à trente minutes de retard** sur les runners gratuits. C'est la nature du service, pas un réglage : la file est partagée et les exécutions gratuites passent après le reste.

Pour du bouturage, dont la fenêtre dure des heures, c'est sans conséquence. Pour une alerte de récolte, ça vide la fonctionnalité de son intérêt.

Les tâches planifiées de Vercel ne sont pas une option non plus : le plan Hobby les limite à **une exécution par jour**.

## La mise en place, dans l'ordre

### 1. Activer les extensions

Supabase → Database → Extensions. Chercher et activer :

- **`pg_cron`** — la planification
- **`pg_net`** — l'appel HTTP sortant

Sans elles, la migration échoue.

### 2. Appliquer la migration

`0012_planificateur.sql` dans le SQL Editor.

### 3. Renseigner l'adresse et le secret

Le secret n'a pas sa place dans un fichier versionné : il vit dans la base, dans une table sans aucune politique, donc inaccessible depuis un navigateur quel que soit le rôle.

```sql
insert into reglages_serveur (cle, valeur) values
  ('url_notifications', 'https://rusticulture.vercel.app/api/notifications'),
  ('cron_secret', 'LA_MEME_VALEUR_QUE_SUR_VERCEL')
on conflict (cle) do update set valeur = excluded.valeur;
```

La valeur de `cron_secret` doit être **identique** à la variable `CRON_SECRET` déclarée sur Vercel. C'est elle qui autorise l'appel.

### 4. Vérifier

```sql
-- La tâche est-elle programmée ?
select jobname, schedule, active from cron.job;

-- Les dernières exécutions
select status, start_time, return_message
from cron.job_run_details order by start_time desc limit 10;

-- Déclencher tout de suite, sans attendre la minute
select declencher_notifications();
```

`status = 'succeeded'` signifie que l'appel est parti. Ce que la route a répondu se lit dans `net._http_response`.

### 5. Côté GitHub

Le workflow a été retiré du projet. Si les secrets `URL_NOTIFICATIONS` et `CRON_SECRET` existent encore dans les réglages du dépôt — Settings → Secrets and variables → Actions — ils ne servent plus à rien et peuvent être supprimés.

## Effet de bord utile

Un projet Supabase gratuit se met en pause après sept jours sans requête. Cette tâche l'interroge chaque minute : le problème disparaît, et la tâche planifiée qui servait à ça devient inutile.

## Coût

Une requête par minute, qui ne fait rien quand aucun seuil n'est franchi. Négligeable sur le plan gratuit.

## Arrêter ou reprendre

```sql
select cron.unschedule('notifications-rusticulture');   -- arrêter
update cron.job set active = false where jobname = 'notifications-rusticulture'; -- suspendre
```

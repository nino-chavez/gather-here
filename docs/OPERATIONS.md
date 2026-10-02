# Keep one wedding running

The account owner can delegate the technical work, but must retain control of GitHub, Cloudflare, Supabase, the mail sender, and any domain. This runbook describes obligations for the future MVP. No backup, restore, sign-in, mail, or real-data launch check has been completed for that application yet.

## Before real guests

Record the deployed code revision, database migration version, resource IDs, exact site origin, selected plans and spending limits in a private operating record. Store credentials only in the owner’s secret manager.

Verify a guest can sign in, save, close the browser, return, and see the same answer the organizer sees. Verify an uninvited or revoked account cannot read or change private records through either the website or direct API. Household grouping alone must never create access.

Choose a retention and deletion policy for guest names, answers, audit records, and images. Decide who can see correction history and how guests receive changes. Do not delete RSVP operation receipts casually: the save protocol depends on them to prevent a delayed or repeated request from applying twice.

Choose backups based on the current Supabase plan, then prove a restore to a separate environment. Verify database records, Auth recovery, private image objects, and permissions separately; a database backup must not be assumed to contain the image bytes. Record the last successful drill and the agreed recovery expectations. Check current [database backup guidance](https://supabase.com/docs/guides/platform/backups) and [Storage backup guidance](https://supabase.com/docs/guides/storage) when implementing.

## During the wedding’s planning period

| Job | Owner’s responsibility | Technical check |
|---|---|---|
| Review replies | Keep invitation assignments and corrections deliberate | Compare question-level replies and event headcounts from one saved snapshot |
| Keep access current | Remove people who no longer need organizer or delegated access | Deactivate database membership/grants, revoke sessions, and verify denial |
| Watch service health | Keep a reachable support contact and check provider notices | Monitor failed app requests, Auth mail delivery, database/storage usage and spend |
| Ship changes | Review changes before they affect guests | Test migrations on rehearsal data, preserve compatibility, verify automatic deployment |
| Protect information | Limit copies and access to guest records | Keep names, email addresses, reply content, tokens and codes out of public logs |
| Keep recovery possible | Confirm backups still run and account recovery still works | Check recent backups, image copies, and restore instructions against actual resources |

## When something goes wrong

**A reply is uncertain:** check the recorded operation and current saved state. Do not tell the guest it failed or resubmit under a new operation ID until reconciliation settles the original intent.

**Sign-in mail does not arrive:** check the authorized address, Auth logs, sender configuration, delivery events and rate limits. Never request that the guest paste a login code into an agent conversation.

**The site is down:** check the actual Worker deployment and provider status. Restore a known compatible application revision if needed. A code rollback does not roll back database schema or data; do not restore or drop a database as a routine website fix.

**Data or an image is missing:** preserve the current state, identify the affected records, and rehearse recovery in a separate environment. The operating owner must approve a destructive restore or deletion.

## After the wedding

Agree on what the couple wants to keep, where the export or archive belongs, and when guest access ends. Verify the retained copy before any deletion. Revoke access and retire optional services deliberately. Cancel bills only after confirming the needed data, domain, images, and recovery information have been preserved. Nothing in this packet authorizes automatic deletion.

## Handoff acceptance

The owner should be able to identify every service, access each account, name the deployed revision, run the documented checks, find the backups, and explain who can help. If an agent needs the original developer’s private repository or laptop to do those jobs, the handoff is incomplete.

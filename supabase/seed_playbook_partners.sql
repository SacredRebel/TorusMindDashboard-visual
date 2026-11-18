-- Optional: load the referral targets named in the Oct 2026 BD & Growth Playbook.
-- Generic placeholders shaped like the playbook's target list (the real names stay out of this public repo).
-- Replace them with the real targets inside the client's own database. Everything starts at "Cold".
-- Run after schema.sql. Safe to re-run: existing rows are left alone.
insert into public.partners (id, contact, org, type, activity, specialty, city, phone, status, owner, next_step) values
  ('P-001', 'Dr. Jane Doe', 'Sample Wellness Clinic', 'Clinical referrer', 'A1', 'HRT / cash-pay wellness', 'City A', '', 'Cold', 'Shari', '20-min in-person meeting; co-produce HRT–ketamine one-pager'),
  ('P-002', 'Pain specialist (TBD)', 'Example Pain Management', 'Clinical referrer', 'A1', 'Pain management', 'City B', '', 'Cold', 'Kim', 'Partnership intro + education series invite'),
  ('P-003', 'Dr. John Doe', 'Demo Functional Medicine', 'Clinical referrer', 'A3', 'Functional medicine', 'City A', '', 'Cold', 'Kim', 'Invite to first lunch-and-learn'),
  ('P-004', 'TBD', 'Sample Primary Care', 'Clinical referrer', 'A3', 'Primary care', 'City C', '', 'Cold', 'Kim', 'Invite to first lunch-and-learn'),
  ('P-005', 'TBD', 'OB-GYN practice #1', 'Clinical referrer', 'A3', 'OB-GYN', 'City A', '', 'Cold', 'Kim', 'Perimenopause–mood brief'),
  ('P-006', 'TBD', 'OB-GYN practice #2', 'Clinical referrer', 'A3', 'OB-GYN', 'City C', '', 'Cold', 'Kim', 'Perimenopause–mood brief'),
  ('P-007', 'First-responder providers', 'Example Health Center', 'Clinical referrer', 'A3', 'Primary care', 'City B', '', 'Cold', 'Kim', 'Invite to first lunch-and-learn'),
  ('P-008', 'Studio owner', 'Sample Yoga Studio', 'Community venue', 'A4', 'Yoga studio', 'City D', '', 'Cold', 'Annette', 'Propose monthly co-hosted talk'),
  ('P-009', 'TBD', 'Example Yoga Studio', 'Community venue', 'A4', 'Yoga studio', 'City A', '', 'Cold', 'Annette', 'Propose monthly co-hosted talk'),
  ('P-010', 'TBD', 'Demo Yoga Studio', 'Community venue', 'A4', 'Yoga studio', 'City D', '', 'Cold', 'Annette', 'Propose monthly co-hosted talk'),
  ('P-011', 'Colleague (TBD)', 'Hospital #1', 'Hospital colleague', 'A5', '', 'City E', '', 'Cold', 'Shari', 'Personal note: 15-min catch-up'),
  ('P-012', 'Colleague (TBD)', 'Hospital #2', 'Hospital colleague', 'A5', '', 'City F', '', 'Cold', 'Shari', 'Personal note: 15-min catch-up'),
  ('P-013', 'Colleague (TBD)', 'Hospital #3', 'Hospital colleague', 'A5', '', '', '', 'Cold', 'Shari', 'Personal note: 15-min catch-up')
on conflict (id) do nothing;

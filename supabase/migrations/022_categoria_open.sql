-- Add Open category (distinct from Primera, highest prestige)
ALTER TYPE categoria_tipo ADD VALUE IF NOT EXISTS 'open' BEFORE 'primera';

# CI/CD Implementation Summary

## Current Scope

The CI/CD pipeline for this repo supports the current deployed architecture:

- `web` frontend image build and push
- nginx + frontend deployment on the target host
- optional monitoring stack deployment

## Active Health Checks

- `web`: container health check
- `nginx`: `/health` endpoint

## Notes

- Redis is not part of the active deployment architecture and is no longer part of the CI/CD health model.
- Backend/session/Turnstile requirements were removed from active CI/CD documentation because they are not implemented in this repo.

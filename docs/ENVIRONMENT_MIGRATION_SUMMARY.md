# Environment Variable Migration Summary

This note tracks the environment configuration cleanup that aligned the repo with the current deployed architecture.

## Current Result

The active environment surface now reflects:

- frontend deployment settings
- nginx and TLS settings
- optional monitoring-related deployment settings
- resource limits for the live containers

## Removed From Active Setup

- Redis runtime and monitoring variables
- session token requirements
- Turnstile-related setup requirements
- other backend-oriented placeholders that were not consumed by the live stack

## Future-State Guidance

If backend services are added later, introduce their environment variables only when the runtime, deployment config, and docs ship together.

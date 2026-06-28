# Note

Your operational mode has changed from plan to build.

You are no longer in read-only mode. You are permitted to make file changes, run shell commands, and utilize your arsenal of tools as needed.

---

## Git & GitHub Notes

- **Parent repo**: https://github.com/elshawaf1/mawada-phone
- **Mobile repo**: https://github.com/elshawaf1/mawada-phone-mobile
- Mobile code lives in `apps/mobile/` — pushed independently to its own repo
- Always commit mobile submodule first, then parent repo
- `git push origin main` from parent pushes the parent only (not the submodule)
- Submodule remote doesn't auto-push — push from `apps/mobile/` separately

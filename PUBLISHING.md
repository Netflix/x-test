# Publishing

This repository publishes two separate npm packages using workspaces:

- `@netflix/x-test` - Browser-only test runner (from root directory)
- `@netflix/x-test-client` - Node.js client libraries (from client/ directory)

We use GitHub Actions to publish new versions from tags. The publishing process
includes updating versions in various `*.json` files, committing those changes,
and tagging the resulting commit. These steps can be done manually, or via the
`bump` script. By publishing, the “Publish” GitHub Action workflow will be
triggered and if all tests pass, it'll publish both packages to npm.

Before you start — make sure you're on the `main` branch and up to date. E.g.,
by running `git checkout main && git pull origin main`.

## Publishing with Manual Prepublish

1. Edit version in **both** package.json files:
   - Root `package.json` (for `@netflix/x-test`)
   - `client/package.json` (for `@netflix/x-test-client`)
   - Also update `package-lock.json` and `jsr.json` files

   Don't forget that `package-lock.json` should be edited in multiple places to
   account for workspace versions. For example, set the “version” key to
   “1.0.0-rc.57” in both package.json files.

2. Add / commit those files. By convention, set the message to the new version
   (e.g., `git commit --message="1.0.0-rc.57"`).

3. Tag the commit using an annotated tag. By convention, set the name to the new
   version _prefixed with a “v”_ and set the message to the new version
   (e.g., `git tag --annotate "v1.0.0-rc.57" --message="1.0.0-rc.57"`).

4. Push the new commit / tags by running `git push origin main --follow-tags`.

5. Find [the tag you just pushed](https://github.com/Netflix/x-test/tags) in
   the GitHub UI and click the “Create release” option. Add any additional
   release information (including to check the box if it’s a “pre-release”).

## Publishing with Assisted Prepublish (`bump`)

1. Run `npm run bump` to view the current version. Then, run the same command
   and provide the version to bump to (e.g., `npm run bump 1.0.0-rc.57`). Note,
   keywords like `major`, `minor`, `patch`, etc. _are_ supported. The bump
   script will update versions in both workspace packages automatically.
2. Push the new commit / tags by running `git push origin main --follow-tags`.
3. Find [the tag you just pushed](https://github.com/Netflix/x-test/tags) in
   the GitHub UI and click the “Create release” option. Add any additional
   release information (including to check the box if it’s a pre-release”).

## Package Information

After publishing, both packages will be available:

- **`@netflix/x-test`**: The main browser test runner library
- **`@netflix/x-test-client`**: Node.js client tools for automation

Both packages are published simultaneously from the same tag using the same
“NPM_SECRET” token.

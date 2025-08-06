#!/bin/bash

# Wrapper around “npm version” which updates both workspace packages and the
#  “jsr.json” file which controls how we publish to JSR.

# Exit upon any failure. I.e., make script strictly sequential.
set -e

# Print current version information.
npm version

# Bail if we don’t have a version string for some reason. This is not an error.
if [ -z "${1}" ]
then
  exit 0
fi

# Bump version in “package.json” files using npm version itself. This ensures
#  that we stay anchored to first-class tooling. Pass “--git-tag-version=false”
#  to prevent the command from (1) committing changes and (2) creating a tag.
prefixed_version="$(npm version --git-tag-version=false "${1}" | grep "^v")"
prefixed_client_version="$(npm version --git-tag-version=false --workspace=@netflix/x-test-client "${1}" | grep "^v")"

# Validate that both packages have the same version.
if [ "${prefixed_version}" != "${prefixed_client_version}" ]
then
  echo "Error: Version mismatch between packages!"
  echo "Root package: ${prefixed_version}"
  echo "Client package: ${prefixed_client_version}"
  exit 1
fi

# The “npm version” command will return the value with a “v” prefix. Ditch that.
version="${prefixed_version:1}"

# Get pointers to files we need to manually update.
root_directory="$(dirname "$(realpath "${0}")")"
jsr_json_file="${root_directory}/jsr.json"
package_json_file="${root_directory}/package.json"
package_lock_json_file="${root_directory}/package-lock.json"
client_directory="${root_directory}/client"
client_jsr_json_file="${client_directory}/jsr.json"
client_package_json_file="${client_directory}/package.json"

# Bump version in “jsr.json” files.
jsr_json_find="\"version\": \"[^\"]*\""
jsr_json_repl="\"version\": \"${version}\""
next_jsr_json_file=$(sed "s/${jsr_json_find}/${jsr_json_repl}/g" "${jsr_json_file}")
next_client_jsr_json_file=$(sed "s/${jsr_json_find}/${jsr_json_repl}/g" "${client_jsr_json_file}")
echo "updating \"${jsr_json_file}\""
echo "${next_jsr_json_file}" > "${jsr_json_file}"
echo "updating \"${client_jsr_json_file}\""
echo "${next_client_jsr_json_file}" > "${client_jsr_json_file}"

# Commit all our changes.
git add "${package_json_file}"
git add "${package_lock_json_file}"
git add "${jsr_json_file}"
git add "${client_package_json_file}"
git add "${client_jsr_json_file}"
git commit --message="${version}"
git tag --annotate "v${version}" --message="${version}"

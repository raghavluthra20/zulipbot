export const run = async function (payload) {
  if (!payload.pull_request || !this.cfg.pulls.ci.travis) return;

  const repoOwner = payload.repository.owner_name;
  const repoName = payload.repository.name;
  const number = payload.pull_request_number;

  const labels = await this.issues.listLabelsOnIssue({
    owner: repoOwner,
    repo: repoName,
    issue_number: number,
  });

  const labelCheck = labels.data.find(
    (label) => label.name === this.cfg.pulls.ci.travis
  );

  if (!labelCheck) return;

  const state = payload.state;
  const url = payload.build_url;

  const comment =
    state === "passed"
      ? this.templates.get("travisPass").format({ url })
      : this.templates.get("travisFail").format({
          buildLogs: `[build logs](${url})`,
          state: state,
        });

  return this.issues.createComment({
    owner: repoOwner,
    repo: repoName,
    issue_number: number,
    body: comment,
  });
};

export const events = ["travis"];

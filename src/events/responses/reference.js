import Search from "../../structures/reference-search.js";

export const run = async function (pull, repo, opened) {
  const author = pull.user.login;
  const number = pull.number;
  const repoName = repo.name;
  const repoOwner = repo.owner.login;

  const references = new Search(this, pull, repo);
  const bodyReferences = await references.getBody();
  const commitReferences = await references.getCommits();

  const missingReferences = bodyReferences.filter(
    (r) => !commitReferences.includes(r)
  );

  const template = this.templates.get("fixCommitWarning");
  const comments = await template.getComments({
    issue_number: number,
    owner: repoOwner,
    repo: repoName,
  });

  if (comments.length === 0 && missingReferences.length > 0) {
    const comment = template.format({
      author: author,
      issues: missingReferences.join(", #"),
      fixIssues: missingReferences.join(", fixes #"),
      issuePronoun: missingReferences.length > 0 ? "them" : "it",
    });
    return this.issues.createComment({
      owner: repoOwner,
      repo: repoName,
      issue_number: number,
      body: comment,
    });
  }

  if (!opened || !this.cfg.pulls.references.labels) return;

  for (const issue of commitReferences) {
    labelReference.call(this, issue, number, repo);
  }
};

async function labelReference(referencedIssue, number, repo) {
  const repoName = repo.name;
  const repoOwner = repo.owner.login;
  const labelCfg = this.cfg.pulls.references.labels;

  const response = await this.issues.listLabelsOnIssue({
    owner: repoOwner,
    repo: repoName,
    issue_number: referencedIssue,
  });

  let labels = response.data.map((label) => label.name);

  if (typeof labelCfg === "object") {
    const cfgCheck = [labelCfg.include, labelCfg.exclude];

    const defined = (array) => Array.isArray(array) && array.length > 0;

    if (cfgCheck.filter((array) => defined(array)).length !== 1) {
      const error = "**ERROR:** Invalid `references.labels` configuration.";
      return this.issues.createComment({
        owner: repoOwner,
        repo: repoName,
        issue_number: number,
        body: error,
      });
    }

    if (defined(labelCfg.include)) {
      labels = labels.filter((label) => labelCfg.include.includes(label));
    }

    if (defined(labelCfg.exclude)) {
      labels = labels.filter((label) => !labelCfg.exclude.includes(label));
    }
  }

  this.issues.addLabels({
    owner: repoOwner,
    repo: repoName,
    issue_number: number,
    labels: labels,
  });
}

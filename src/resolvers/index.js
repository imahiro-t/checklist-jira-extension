import Resolver from "@forge/resolver";
import api, { route } from "@forge/api";

const PROPERTY_KEY = "checklist_settings_key";
const CHECKLIST_ISSUE_PROPERTY_KEY = "checklist_issue_settings_key";
const CHECKLIST_RESULT_KEY = "checklist_result";

const deflateJson = (body) => {
  const zlib = require("node:zlib");
  return JSON.stringify({
    v: zlib
      .deflateRawSync(Buffer.from(JSON.stringify(body)))
      .toString("base64"),
  });
};

const inflateJson = (json) => {
  const zlib = require("node:zlib");
  if (json["value"]["v"]) {
    return JSON.parse(
      zlib.inflateRawSync(Buffer.from(json["value"]["v"], "base64")).toString()
    );
  } else {
    return json["value"];
  }
};

const getProjectProperty = async (projectId) => {
  if (!projectId) {
    return {};
  }
  const response = await api
    .asUser()
    .requestJira(
      route`/rest/api/3/project/${projectId}/properties/${PROPERTY_KEY}`,
      {
        headers: {
          Accept: "application/json",
        },
      }
    );
  if (response.status !== 200) {
    return {};
  }
  return inflateJson(await response.json());
};

const setProjectProperty = async (data, projectId) => {
  const body = data;
  const response = await api
    .asUser()
    .requestJira(
      route`/rest/api/3/project/${projectId}/properties/${PROPERTY_KEY}`,
      {
        method: "PUT",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: deflateJson(body),
      }
    );
  if (response.status !== 200 && response.status !== 201) {
    return false;
  }
  return true;
};

const getIssueProperty = async (issueId) => {
  if (!issueId) {
    return {};
  }
  const response = await api
    .asUser()
    .requestJira(
      route`/rest/api/3/issue/${issueId}/properties/${CHECKLIST_ISSUE_PROPERTY_KEY}`,
      {
        headers: {
          Accept: "application/json",
        },
      }
    );
  if (response.status !== 200) {
    return {};
  }
  return inflateJson(await response.json());
};

const setIssueProperty = async (data, issueId) => {
  const body = data;
  const response = await api
    .asUser()
    .requestJira(
      route`/rest/api/3/issue/${issueId}/properties/${CHECKLIST_ISSUE_PROPERTY_KEY}`,
      {
        method: "PUT",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: deflateJson(body),
      }
    );
  try {
    const sumUp = calcSumUp(data);
    await api
      .asUser()
      .requestJira(
        route`/rest/api/3/issue/${issueId}/properties/${CHECKLIST_RESULT_KEY}`,
        {
          method: "PUT",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(sumUp),
        }
      );
  } catch (e) {}
  if (response.status !== 200 && response.status !== 201) {
    return false;
  }
  return true;
};

const calcSumUp = (data) => {
  const checklists = data.checklists ?? [];
  const titles = [];
  const checklistAcc = checklists.reduce(
    (acc, checklist) => {
      titles.push(checklist.label);
      const fields = checklist.fields ?? [];
      const fieldAcc = fields.reduce(
        (acc, field) => {
          if (field.type === "check") {
            acc[field.status] = acc[field.status] + 1;
          }
          return acc;
        },
        [0, 0, 0, 0]
      );
      for (let i = 0; i < 4; i++) {
        acc[i] = acc[i] + fieldAcc[i];
      }
      return acc;
    },
    [0, 0, 0, 0]
  );
  return {
    title: titles.join(" | "),
    todo: checklistAcc[0],
    in_progress: checklistAcc[1],
    skipped: checklistAcc[2],
    done: checklistAcc[3],
  };
};

const resolver = new Resolver();

resolver.define("getProjectProperty", async (req) => {
  const { projectId } = req.payload;
  return await getProjectProperty(projectId);
});

resolver.define("setProjectProperty", async (req) => {
  const { data, projectId } = req.payload;
  return await setProjectProperty(data, projectId);
});

resolver.define("getIssueProperty", async (req) => {
  const { issueId } = req.payload;
  return await getIssueProperty(issueId);
});

resolver.define("setIssueProperty", async (req) => {
  const { data, issueId } = req.payload;
  return await setIssueProperty(data, issueId);
});

export const handler = resolver.getDefinitions();

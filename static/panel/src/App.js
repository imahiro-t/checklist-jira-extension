import React, { useEffect, useState } from "react";

import { Box, Inline, Stack, Text } from "@atlaskit/primitives";
import { ButtonGroup } from "@atlaskit/button";
import Button, { IconButton } from "@atlaskit/button/new";
import Lozenge from "@atlaskit/lozenge";
import SVG from "@atlaskit/icon/svg";
import ChevronDownIcon from "@atlaskit/icon/glyph/chevron-down";
import ChevronUpIcon from "@atlaskit/icon/glyph/chevron-up";
import ShortcutIcon from "@atlaskit/icon/glyph/shortcut";
import SectionMessage from "@atlaskit/section-message";
import { useThemeObserver, token } from "@atlaskit/tokens";
import { invoke, view, router } from "@forge/bridge";

import { ThemeProvider, createTheme } from "@mui/material/styles";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import Divider from "@mui/material/Divider";
import FormControlLabel from "@mui/material/FormControlLabel";
import Checkbox from "@mui/material/Checkbox";

const App = () => {
  const [context, setContext] = useState();
  const theme = useThemeObserver();
  useEffect(async () => {
    await view.theme.enable();
  }, []);
  useEffect(() => {
    view.getContext().then(setContext);
  }, []);
  if (!context) {
    return " ";
  }

  const currentTheme = (theme) =>
    createTheme({
      palette: {
        mode: theme,
      },
    });

  const {
    extension: { project, issue },
  } = context;
  return (
    <ThemeProvider theme={currentTheme(theme.colorMode)}>
      <View project={project} issue={issue} />
    </ThemeProvider>
  );
};

const FIELD_TYPE = {
  CHECK: "check",
  SEPARATOR: "separator",
};

const FIELD_STATUS = {
  TODO: 0,
  IN_PROGRESS: 1,
  SKIPPED: 2,
  DONE: 3,
};

const status = (checklist) => {
  const todo =
    checklist.fields?.filter(
      (field) =>
        field.type === FIELD_TYPE.CHECK && field.status === FIELD_STATUS.TODO
    )?.length ?? 0;
  const inProgress =
    checklist.fields?.filter(
      (field) =>
        field.type === FIELD_TYPE.CHECK &&
        field.status === FIELD_STATUS.IN_PROGRESS
    )?.length ?? 0;
  const skipped =
    checklist.fields?.filter(
      (field) =>
        field.type === FIELD_TYPE.CHECK && field.status === FIELD_STATUS.SKIPPED
    )?.length ?? 0;
  const done =
    checklist.fields?.filter(
      (field) =>
        field.type === FIELD_TYPE.CHECK && field.status === FIELD_STATUS.DONE
    )?.length ?? 0;

  return { todo, inProgress, skipped, done };
};

const color = (checklist) => {
  const { todo, inProgress, skipped, done } = status(checklist);
  if ((done > 0 || skipped > 0) && inProgress === 0 && todo === 0) {
    return "color.background.success";
  } else if (
    (done > 0 || skipped > 0 || inProgress > 0) &&
    (inProgress > 0 || todo > 0)
  ) {
    return "color.background.warning";
  } else {
    return "color.background.input.hovered";
  }
};

const View = ({ project, issue }) => {
  const [projectProperty, setProjectProperty] = useState();
  const [issueProperty, setIssueProperty] = useState();
  const [isConfigurationOpen, setIsConfigurationOpen] = useState(false);
  const [isInvalid, setIsInvalid] = useState(false);
  const [isChecklistsOpen, setIsChecklistsOpen] = useState([]);
  const openConfiguration = () => setIsConfigurationOpen(true);
  const closeConfiguration = () => setIsConfigurationOpen(false);

  useEffect(() => {
    invoke("getProjectProperty", {
      projectId: project.id,
    }).then((data) => {
      const styledData =
        !data || !data.templates
          ? {
              templates: [],
            }
          : data;
      if (styledData.templates.length === 0) {
        setIsInvalid(true);
      }
      setProjectProperty(styledData);
    });
  }, []);

  useEffect(() => {
    if (projectProperty) {
      invoke("getIssueProperty", {
        issueId: issue.id,
      }).then((data) => {
        const styledData =
          !data || !data.checklists
            ? {
                checklists: [],
              }
            : data;

        styledData.checklists.forEach((checklist) => {
          const template = structuredClone(projectProperty).templates.find(
            (template) => template.id === checklist.id
          );
          if (template) {
            checklist.label = template.label;
            template.fields.forEach((templateField) => {
              const field = checklist.fields.find(
                (field) => field.id === templateField.id
              );
              if (field) {
                templateField.status = field.status;
              }
            });
            checklist.fields = template.fields;
          }
        });
        const newIssueProperty = { checklists: styledData.checklists };
        invoke("setIssueProperty", {
          data: newIssueProperty,
          issueId: issue.id,
        }).then((data) => {
          if (data) {
            resetIssueProperty(newIssueProperty);
          }
        });
      });
    }
  }, [projectProperty]);

  const SettingIcon = (props) => {
    const { size } = props;
    return (
      <SVG size={size}>
        <path
          fill="currentColor"
          fill-rule="evenodd"
          d="M14.208 4.83q.68.21 1.3.54l1.833-1.1a1 1 0 0 1 1.221.15l1.018 1.018a1 1 0 0 1 .15 1.221l-1.1 1.833q.33.62.54 1.3l2.073.519a1 1 0 0 1 .757.97v1.438a1 1 0 0 1-.757.97l-2.073.519q-.21.68-.54 1.3l1.1 1.833a1 1 0 0 1-.15 1.221l-1.018 1.018a1 1 0 0 1-1.221.15l-1.833-1.1q-.62.33-1.3.54l-.519 2.073a1 1 0 0 1-.97.757h-1.438a1 1 0 0 1-.97-.757l-.519-2.073a7.5 7.5 0 0 1-1.3-.54l-1.833 1.1a1 1 0 0 1-1.221-.15L4.42 18.562a1 1 0 0 1-.15-1.221l1.1-1.833a7.5 7.5 0 0 1-.54-1.3l-2.073-.519A1 1 0 0 1 2 12.72v-1.438a1 1 0 0 1 .757-.97l2.073-.519q.21-.68.54-1.3L4.27 6.66a1 1 0 0 1 .15-1.221L5.438 4.42a1 1 0 0 1 1.221-.15l1.833 1.1q.62-.33 1.3-.54l.519-2.073A1 1 0 0 1 11.28 2h1.438a1 1 0 0 1 .97.757zM12 16a4 4 0 1 0 0-8a4 4 0 0 0 0 8"
        />{" "}
      </SVG>
    );
  };

  const resetIssueProperty = (data) => {
    setIssueProperty(data);
    if (data != {}) {
      const isChecklistsOpen = data.checklists.map((checklist) => ({
        id: checklist.id,
        isOpen: false,
      }));
      setIsChecklistsOpen(isChecklistsOpen);
    } else {
      setIsChecklistsOpen([]);
    }
  };

  const toggleChevron = (id) => (event) => {
    const newIsChecklistOpen = isChecklistsOpen.map((checklist) =>
      checklist.id === id
        ? {
            id: checklist.id,
            isOpen: !checklist.isOpen,
          }
        : checklist
    );
    setIsChecklistsOpen(newIsChecklistOpen);
  };

  const isChecklistOpen = (id) => {
    return (
      isChecklistsOpen.find((checklist) => checklist.id === id)?.isOpen ?? false
    );
  };

  return projectProperty && issueProperty ? (
    <>
      {issueProperty.checklists.map((checklist, index) => {
        const { todo, inProgress, skipped, done } = status(checklist);
        return (
          <>
            {index !== 0 && <Box padding="space.100"></Box>}
            <Box padding="space.050" backgroundColor={color(checklist)}>
              <Inline alignBlock="center" spread="space-between">
                <Box>
                  <Inline space="space.050" alignBlock="center" shouldWrap>
                    <Text size="small" as="strong">
                      {checklist.label}
                    </Text>
                  </Inline>
                  <Inline space="space.050" alignBlock="center" shouldWrap>
                    <Lozenge appearance="success" isBold>
                      {"DONE: " + (done || 0)}
                    </Lozenge>
                    <Lozenge appearance="default" isBold>
                      {"SKIPPED: " + (skipped || 0)}
                    </Lozenge>
                    <Lozenge appearance="inprogress" isBold>
                      {"IN PROGRESS: " + (inProgress || 0)}
                    </Lozenge>
                    <Lozenge appearance="default">
                      {"TODO: " + (todo || 0)}
                    </Lozenge>
                  </Inline>
                </Box>
                <Inline alignBlock="center" alignInline="end">
                  <IconButton
                    icon={
                      isChecklistOpen(checklist.id)
                        ? ChevronUpIcon
                        : ChevronDownIcon
                    }
                    appearance="subtle"
                    spacing="compact"
                    onClick={toggleChevron(checklist.id)}
                  ></IconButton>
                </Inline>
              </Inline>
            </Box>
            {isChecklistOpen(checklist.id) && (
              <Checklist
                issue={issue}
                checklistId={checklist.id}
                issueProperty={issueProperty}
                setIssueProperty={setIssueProperty}
              />
            )}
          </>
        );
      })}
      {isInvalid && (
        <SectionMessage appearance="warning">
          <Text>
            Checklist Configuration is required. Please configure in the Project
            settings.
          </Text>
        </SectionMessage>
      )}
      {!isInvalid && !isConfigurationOpen && (
        <Box padding="space.050">
          <Inline alignBlock="center" alignInline="end">
            <IconButton
              icon={(iconProps) => <SettingIcon {...iconProps} size="small" />}
              appearance="subtle"
              spacing="compact"
              onClick={openConfiguration}
            ></IconButton>
          </Inline>
        </Box>
      )}
      {isConfigurationOpen && (
        <Config
          issue={issue}
          projectProperty={projectProperty}
          issueProperty={issueProperty}
          resetIssueProperty={resetIssueProperty}
          closeConfiguration={closeConfiguration}
        />
      )}
    </>
  ) : (
    <>{!isInvalid && <>Loading...</>}</>
  );
};

const Config = ({
  issue,
  projectProperty,
  issueProperty,
  resetIssueProperty,
  closeConfiguration,
}) => {
  const [templateSelectStatuses, setTemplateSelectStatuses] = useState();
  const [isSaving, setIsSaving] = useState(false);
  const templates = projectProperty.templates ?? [];
  const checklists = issueProperty.checklists ?? [];
  const removedTemplates = structuredClone(
    checklists.filter(
      (checklist) => !templates.find((template) => template.id === checklist.id)
    )
  );

  useEffect(() => {
    const templateSelectStatuses = templates.map((template) => ({
      id: template.id,
      selected: !!checklists.find((checklist) => checklist.id === template.id),
    }));
    const removedTemplateSelectStatuses = removedTemplates.map((template) => ({
      id: template.id,
      selected: true,
    }));
    setTemplateSelectStatuses(
      templateSelectStatuses.concat(removedTemplateSelectStatuses)
    );
  }, []);

  const handleTemplateCheckbox = (id) => (event) => {
    const nweTemplatesSelectStatus = templateSelectStatuses.map(
      (selectStatus) =>
        selectStatus.id === id
          ? {
              id: selectStatus.id,
              selected: event.target.checked,
            }
          : selectStatus
    );
    setTemplateSelectStatuses(nweTemplatesSelectStatus);
  };

  const saveConfiguration = (event) => {
    setIsSaving(true);
    const newChecklists = templateSelectStatuses
      .filter((selectStatus) => selectStatus.selected)
      .map((selectStatus) => {
        const template = templates.find(
          (template) => template.id === selectStatus.id
        );
        const removedTemplate = removedTemplates.find(
          (template) => template.id === selectStatus.id
        );
        return template ?? removedTemplate;
      });
    newChecklists.forEach((newChecklist) => {
      const foundChecklist = checklists.find(
        (checklist) => checklist.id === newChecklist.id
      );
      if (foundChecklist) {
        newChecklist.fields.forEach((newField) => {
          const foundField = foundChecklist.fields.find(
            (field) => field.id === newField.id
          );
          if (foundField) {
            newField["status"] = foundField["status"];
          }
        });
      }
    });
    const newIssueProperty = { checklists: newChecklists };
    invoke("setIssueProperty", {
      data: newIssueProperty,
      issueId: issue.id,
    })
      .then((data) => {
        if (data) {
          resetIssueProperty(newIssueProperty);
        }
        closeConfiguration();
      })
      .finally(() => {
        setIsSaving(false);
      });
  };

  const checkboxStyles = {
    ".MuiButtonBase-root": {
      width: 24,
      padding: 0,
      margin: "0 4px 0 4px",
    },
    ".MuiSvgIcon-root": { width: 18 },
    ".MuiFormControlLabel-label": { fontSize: 13 },
  };

  return (
    <>
      <Box padding="space.100"></Box>
      <Box backgroundColor="color.background.input.hovered">
        <Box padding="space.050">
          <Text weight="bold">Configuration</Text>
        </Box>
        {templateSelectStatuses && (
          <Box padding="space.050">
            {templates.length > 0 && (
              <Stack>
                <Text size="small" weight="bold">
                  Templates
                </Text>
              </Stack>
            )}
            {templates.map((template) => (
              <Stack>
                <FormControlLabel
                  sx={checkboxStyles}
                  label={template.label}
                  control={
                    <Checkbox
                      checked={
                        templateSelectStatuses.find((selectedTemplate) => {
                          return selectedTemplate.id == template.id;
                        }).selected
                      }
                      onChange={handleTemplateCheckbox(template.id)}
                    />
                  }
                />
              </Stack>
            ))}
            {removedTemplates.length > 0 && (
              <Stack>
                <Text size="small" weight="bold">
                  Removed Templates
                </Text>
              </Stack>
            )}
            {removedTemplates.map((template) => (
              <Stack>
                <FormControlLabel
                  sx={checkboxStyles}
                  label={template.label}
                  control={
                    <Checkbox
                      checked={
                        templateSelectStatuses.find((selectedTemplate) => {
                          return selectedTemplate.id == template.id;
                        }).selected
                      }
                      onChange={handleTemplateCheckbox(template.id)}
                    />
                  }
                />
              </Stack>
            ))}
          </Box>
        )}
        <Box padding="space.050">
          <ButtonGroup>
            <Button
              onClick={saveConfiguration}
              appearance="primary"
              isLoading={isSaving}
            >
              Save
            </Button>
            <Button onClick={closeConfiguration} appearance="subtle">
              Cancel
            </Button>
          </ButtonGroup>
        </Box>
      </Box>
    </>
  );
};

const Checklist = ({ issue, checklistId, issueProperty, setIssueProperty }) => {
  const [checklist, setChecklist] = useState();
  useEffect(() => {
    setChecklist(issueProperty.checklists.find((c) => c.id === checklistId));
  }, [issueProperty]);

  const handleFieldCheckbox = (id) => (event) => {
    const newIssueProperty = structuredClone(issueProperty);
    newIssueProperty.checklists.forEach((checklist) => {
      if (checklist.id === checklistId) {
        checklist.fields.forEach((field) => {
          if (field.id === id) {
            if (event.target.checked) {
              field.status = FIELD_STATUS.DONE;
            } else {
              field.status = FIELD_STATUS.TODO;
            }
          }
        });
      }
    });
    setIssueProperty(newIssueProperty);
    invoke("setIssueProperty", {
      data: newIssueProperty,
      issueId: issue.id,
    }).then((data) => {
      if (data !== true) {
        setIssueProperty(issueProperty);
      }
    });
  };

  const handleChange = (id) => (event) => {
    const newIssueProperty = structuredClone(issueProperty);
    newIssueProperty.checklists.forEach((checklist) => {
      if (checklist.id === checklistId) {
        checklist.fields.forEach((field) => {
          if (field.id === id) {
            field.status = event.target.value;
          }
        });
      }
    });
    setIssueProperty(newIssueProperty);
    invoke("setIssueProperty", {
      data: newIssueProperty,
      issueId: issue.id,
    }).then((data) => {
      if (data !== true) {
        setIssueProperty(issueProperty);
      }
    });
  };

  const Link = ({ children, href }) => {
    const handleNavigate = () => {
      router.open(href);
    };

    return (
      <a style={{ cursor: "pointer" }} onClick={handleNavigate}>
        {children} <ShortcutIcon size="small" label="" />
      </a>
    );
  };

  const sliceTextByMarkdownLink = (text) => {
    const markdownUrlRegex = /\[([^\]]+)\]\((https?:\/\/[^\s]+)\)/g;
    let result = [];
    let lastIndex = 0;
    text.replace(markdownUrlRegex, (match, p1, p2, index) => {
      result.push(text.slice(lastIndex, index));
      result.push(
        <>
          {" "}
          <Link href={p2} target="_blank">
            {p1}
          </Link>{" "}
        </>
      );
      lastIndex = index + match.length;
    });
    result.push(text.slice(lastIndex));
    return result;
  };

  const backgroundColors = [
    token("color.background.neutral"),
    token("color.background.information.bold"),
    token("color.background.neutral.bold"),
    token("color.background.success.bold"),
  ];
  const fontColors = [
    token("color.text"),
    token("color.text.inverse"),
    token("color.text.inverse"),
    token("color.text.inverse"),
  ];

  return (
    <>
      <Box padding="space.050">
        {checklist &&
          checklist.fields.map((field) => {
            const checkboxStyles = {
              ".MuiButtonBase-root": {
                width: 24,
                padding: 0,
                margin: "0 4px 0 4px",
              },
              ".MuiSvgIcon-root": { width: 16 },
              ".MuiFormControlLabel-label": { fontSize: 11 },
            };
            const selectStyles = {
              minWidth: 100,
              ".MuiInputBase-root": {
                backgroundColor: backgroundColors[field.status],
                color: fontColors[field.status],
                fontWeight: "bold",
                fontSize: 10,
                maxHeight: 20,
              },
              ".MuiSelect-select": { padding: "2px 20px 2px 5.5px !important" },
              ".MuiSvgIcon-root": { right: 1 },
            };
            const menuItemStyles = {
              fontSize: 10,
              maxHeight: 20,
              minHeight: 20,
              padding: "2px 20px 2px 5.5px !important",
            };

            return (
              <Box padding="space.050">
                {field.type === FIELD_TYPE.CHECK && (
                  <Inline alignBlock="center" spread="space-between">
                    <Inline alignBlock="center">
                      <FormControlLabel
                        sx={checkboxStyles}
                        label={field.label}
                        disabled={field.status === FIELD_STATUS.SKIPPED}
                        control={
                          <Checkbox
                            checked={field.status === FIELD_STATUS.DONE}
                            onChange={handleFieldCheckbox(field.id)}
                          />
                        }
                      />
                    </Inline>
                    <Inline alignBlock="center" alignInline="end">
                      <FormControl sx={selectStyles} size="small">
                        <Select
                          value={field.status}
                          onChange={handleChange(field.id)}
                          MenuProps={{
                            autoFocus: false,
                            disableAutoFocusItem: true,
                            disableEnforceFocus: true,
                            disableAutoFocus: true,
                          }}
                        >
                          <MenuItem value={0} sx={menuItemStyles}>
                            TODO
                          </MenuItem>
                          <MenuItem value={1} sx={menuItemStyles}>
                            IN PROGRESS
                          </MenuItem>
                          <MenuItem value={2} sx={menuItemStyles}>
                            SKIPPED
                          </MenuItem>
                          <MenuItem value={3} sx={menuItemStyles}>
                            DONE
                          </MenuItem>
                        </Select>
                      </FormControl>
                    </Inline>
                  </Inline>
                )}
                {field.type === FIELD_TYPE.SEPARATOR && (
                  <Divider textAlign="left">
                    <Text size="small">{field.label}</Text>
                  </Divider>
                )}
                <Text
                  size="small"
                  as="em"
                  color={
                    field.status === FIELD_STATUS.SKIPPED
                      ? "color.text.disabled"
                      : "color.text"
                  }
                >
                  {sliceTextByMarkdownLink(field.description).map(
                    (text) => text
                  )}
                </Text>
              </Box>
            );
          })}{" "}
      </Box>
    </>
  );
};

export default App;

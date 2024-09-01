import React, { useEffect, useState } from "react";

import { Box, Inline, Stack, Text, xcss } from "@atlaskit/primitives";
import Button, { IconButton } from "@atlaskit/button/new";
import ChevronDownIcon from "@atlaskit/icon/glyph/chevron-down";
import ChevronUpIcon from "@atlaskit/icon/glyph/chevron-up";
import ArrowDownIcon from "@atlaskit/icon/glyph/arrow-down";
import ArrowUpIcon from "@atlaskit/icon/glyph/arrow-up";
import TrashIcon from "@atlaskit/icon/glyph/trash";
import EditorAddIcon from "@atlaskit/icon/glyph/editor/add";
import EditorCodeIcon from "@atlaskit/icon/glyph/editor/code";
import EditorCloseIcon from "@atlaskit/icon/glyph/editor/close";
import EditorDoneIcon from "@atlaskit/icon/glyph/editor/done";
import SectionMessage from "@atlaskit/section-message";
import { useThemeObserver } from "@atlaskit/tokens";
import { invoke, view } from "@forge/bridge";

import { ThemeProvider, createTheme } from "@mui/material/styles";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import TextField from "@mui/material/TextField";

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
    extension: { project },
  } = context;
  return (
    <ThemeProvider theme={currentTheme(theme.colorMode)}>
      <View project={project} />
    </ThemeProvider>
  );
};

const MAX_TEMPLATE = 10;
const MAX_FIELD = 50;

const FIELD_TYPE = {
  CHECK: "check",
  SEPARATOR: "separator",
};

const generateDefaultTemplate = () => ({
  id: generateTimestampId(),
  label: "",
  fields: [generateDefaultField()],
});

const generateDefaultField = () => ({
  id: generateTimestampId(),
  type: FIELD_TYPE.CHECK,
  label: "",
  description: "",
  status: 0,
});

const generateTimestampId = () => {
  return Date.now().toString(36);
};

const textFieldStyles = {
  ".MuiInputBase-root": {
    width: 300,
    height: 25,
    fontSize: 12,
    fontWeight: 100,
  },
  ".MuiInputBase-input": { padding: "4px" },
};

const View = ({ project }) => {
  const [projectProperty, setProjectProperty] = useState();
  const [json, setJson] = useState();
  const [isTemplatesOpen, setIsTemplatesOpen] = useState([]);
  const [isCodeEditorOpen, setIsCodeEditorOpen] = useState(false);
  const [isLoadFailed, setIsLoadFailed] = useState(false);
  const [isSaveFailed, setIsSaveFailed] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isJsonInvalid, setIsJsonInvalid] = useState(false);

  useEffect(() => {
    setIsLoadFailed(false);
    invoke("getProjectProperty", {
      projectId: project.id,
    })
      .then((data) => {
        const styledData =
          !data || !data.templates
            ? {
                templates: [],
              }
            : data;
        resetIsTemplateOpen(styledData.templates);
        setProjectProperty(styledData);
      })
      .catch((e) => {
        setIsLoadFailed(true);
      });
  }, []);

  const resetIsTemplateOpen = (templates) => {
    if (templates) {
      const newIsTemplatesOpen = templates.map((template) => {
        const oldIsTemplateOpen = isTemplatesOpen.find(
          (v) => v.id === template.id
        );
        return oldIsTemplateOpen
          ? {
              id: oldIsTemplateOpen.id,
              isOpen: oldIsTemplateOpen.isOpen,
            }
          : {
              id: template.id,
              isOpen: false,
            };
      });
      setIsTemplatesOpen(newIsTemplatesOpen);
    } else {
      setIsTemplatesOpen([]);
    }
  };

  const saveConfiguration = (event) => {
    setIsSaving(true);
    setIsSaveFailed(false);
    invoke("setProjectProperty", {
      data: projectProperty,
      projectId: project.id,
    })
      .then((data) => {
        setIsSaveFailed(!data);
      })
      .catch((e) => {
        setIsSaveFailed(true);
      })
      .finally(() => {
        setIsSaving(false);
      });
  };

  const toggleChevron = (id) => (event) => {
    const newIsTemplatesOpen = isTemplatesOpen.map((template) =>
      template.id === id
        ? {
            id: template.id,
            isOpen: !template.isOpen,
          }
        : {
            id: template.id,
            isOpen: false,
          }
    );
    setIsTemplatesOpen(newIsTemplatesOpen);
  };

  const isTemplateOpen = (id) => {
    return (
      isTemplatesOpen.find((template) => template.id === id)?.isOpen ?? false
    );
  };

  const openCodeEditor = (event) => {
    setJson(JSON.stringify(projectProperty, null, 4));
    setIsCodeEditorOpen(true);
  };

  const closeCodeEditor = (event) => {
    setIsCodeEditorOpen(false);
  };

  const checkJson = (event) => {
    setIsJsonInvalid(false);
    try {
      const newProjectProperty = JSON.parse(json);
      if (!newProjectProperty.templates) throw new Exception();
      if (
        !(
          newProjectProperty.templates.length >= 0 &&
          newProjectProperty.templates.length <= MAX_TEMPLATE
        )
      )
        throw new Exception();
      newProjectProperty.templates.forEach((template) => {
        if (!(template.id && template.id.length > 0)) throw new Exception();
        if (!template.fields) throw new Exception();
        if (
          !(template.fields.length >= 0 && template.fields.length <= MAX_FIELD)
        )
          throw new Exception();
        if (!template.label) template["label"] = "";
        template.fields.forEach((field) => {
          if (!(field.id && field.id.length > 0)) throw new Exception();
          if (
            !(
              field.type === FIELD_TYPE.CHECK ||
              field.type === FIELD_TYPE.SEPARATOR
            )
          )
            throw new Exception();
          if (!field.label) field["label"] = "";
          if (!field.description) field["description"] = "";
          if (!field.status) field["status"] = 0;
        });
      });
      resetIsTemplateOpen(newProjectProperty.templates);
      setProjectProperty(newProjectProperty);
      closeCodeEditor();
    } catch (e) {
      setIsJsonInvalid(true);
    }
  };

  const changeJson = (event) => {
    setJson(event.target.value);
  };

  const addTemplate = (event) => {
    if (projectProperty.templates.length < MAX_TEMPLATE) {
      const newProjectProperty = structuredClone(projectProperty);
      const newTemplate = generateDefaultTemplate();
      newProjectProperty.templates.push(newTemplate);
      resetIsTemplateOpen(newProjectProperty.templates);
      setProjectProperty(newProjectProperty);
    }
  };

  const removeTemplate = (index) => (event) => {
    const newProjectProperty = structuredClone(projectProperty);
    newProjectProperty.templates.splice(index, 1);
    resetIsTemplateOpen(newProjectProperty.templates);
    setProjectProperty(newProjectProperty);
  };

  const switchOrder = (before, after) => (event) => {
    const newProjectProperty = structuredClone(projectProperty);
    [
      newProjectProperty.templates[before],
      newProjectProperty.templates[after],
    ] = [
      newProjectProperty.templates[after],
      newProjectProperty.templates[before],
    ];
    setProjectProperty(newProjectProperty);
  };

  const changeTemplateLabel = (id) => (event) => {
    const newProjectProperty = structuredClone(projectProperty);
    newProjectProperty.templates.forEach((template) => {
      if (template.id === id) {
        template.label = event.target.value;
      }
    });
    setProjectProperty(newProjectProperty);
  };

  const boxStyles = (isOpen) =>
    xcss({
      borderColor: isOpen ? "color.border.selected" : "color.border.focused",
      borderStyle: "solid",
      borderRadius: "3px",
      borderWidth: "border.width",
    });

  const jsonErrorBoxStyles = xcss({
    borderColor: "color.border.danger",
    borderStyle: "solid",
    borderRadius: "3px",
    borderWidth: "border.width",
  });

  const textAreaStyles = {
    ".MuiInputBase-root": {
      fontSize: 12,
      fontWeight: 100,
    },
    ".MuiInputBase-input": { padding: "2px" },
  };

  return projectProperty ? (
    <>
      {!isCodeEditorOpen && (
        <>
          {isLoadFailed && (
            <SectionMessage appearance="error">
              <Text>An error occurred while loading...</Text>
            </SectionMessage>
          )}
          {isSaveFailed && (
            <SectionMessage appearance="error">
              <Text>An error occurred while saving...</Text>
            </SectionMessage>
          )}
          <Box padding="space.050">
            <Inline alignBlock="center" spread="space-between">
              <Button
                onClick={saveConfiguration}
                appearance="primary"
                spacing="compact"
                isLoading={isSaving}
              >
                Save
              </Button>
              <Inline alignInline="end">
                <IconButton
                  icon={EditorCodeIcon}
                  appearance="subtle"
                  spacing="compact"
                  onClick={openCodeEditor}
                ></IconButton>
                <IconButton
                  icon={EditorAddIcon}
                  appearance="subtle"
                  spacing="compact"
                  onClick={addTemplate}
                ></IconButton>
              </Inline>
            </Inline>
          </Box>
          {projectProperty.templates?.map((template, index) => {
            return (
              <>
                {index !== 0 && <Box padding="space.100"></Box>}
                <Box
                  padding="space.050"
                  xcss={boxStyles(isTemplateOpen(template.id))}
                >
                  <Inline alignBlock="center" spread="space-between">
                    <Stack>
                      <Text size="small">Template Title</Text>
                      <TextField
                        value={template.label}
                        onChange={changeTemplateLabel(template.id)}
                        fullWidth
                        sx={textFieldStyles}
                      />
                    </Stack>
                    <Inline alignInline="end">
                      <IconButton
                        icon={ArrowDownIcon}
                        appearance="subtle"
                        spacing="compact"
                        isDisabled={
                          index === projectProperty.templates.length - 1
                        }
                        onClick={switchOrder(index, index + 1)}
                      ></IconButton>
                      <IconButton
                        icon={ArrowUpIcon}
                        appearance="subtle"
                        spacing="compact"
                        isDisabled={index === 0}
                        onClick={switchOrder(index, index - 1)}
                      ></IconButton>
                      <IconButton
                        icon={TrashIcon}
                        appearance="subtle"
                        spacing="compact"
                        onClick={removeTemplate(index)}
                      ></IconButton>
                      <IconButton
                        icon={
                          isTemplateOpen(template.id)
                            ? ChevronUpIcon
                            : ChevronDownIcon
                        }
                        appearance="subtle"
                        spacing="compact"
                        onClick={toggleChevron(template.id)}
                      ></IconButton>
                    </Inline>
                  </Inline>
                  {isTemplateOpen(template.id) && (
                    <Template
                      templateId={template.id}
                      projectProperty={projectProperty}
                      setProjectProperty={setProjectProperty}
                    />
                  )}
                </Box>
              </>
            );
          })}
        </>
      )}
      {isCodeEditorOpen && (
        <>
          {isJsonInvalid && (
            <SectionMessage appearance="error">
              <Text>Something wrong with your input...</Text>
            </SectionMessage>
          )}
          <Box padding="space.050">
            <Inline alignBlock="center" alignInline="end">
              <IconButton
                icon={EditorDoneIcon}
                appearance="subtle"
                spacing="compact"
                onClick={checkJson}
              ></IconButton>
              <IconButton
                icon={EditorCloseIcon}
                appearance="subtle"
                spacing="compact"
                onClick={closeCodeEditor}
              ></IconButton>
            </Inline>
          </Box>
          <Box padding="space.050" xcss={isJsonInvalid && jsonErrorBoxStyles}>
            <TextField
              value={json}
              onChange={changeJson}
              multiline
              rows={30}
              fullWidth
              sx={textAreaStyles}
            />
          </Box>
        </>
      )}{" "}
    </>
  ) : (
    <>Loading...</>
  );
};

const Template = ({ templateId, projectProperty, setProjectProperty }) => {
  const getTemplate = () => {
    return projectProperty.templates.find(
      (template) => template.id === templateId
    );
  };

  const addField = (event) => {
    if (getTemplate().fields.length < MAX_FIELD) {
      const newProjectProperty = structuredClone(projectProperty);
      newProjectProperty.templates.forEach((template) => {
        if (template.id === templateId) {
          template.fields.push(generateDefaultField());
        }
      });
      setProjectProperty(newProjectProperty);
    }
  };

  const removeField = (index) => (event) => {
    const newProjectProperty = structuredClone(projectProperty);
    newProjectProperty.templates.forEach((template) => {
      if (template.id === templateId) {
        template.fields.splice(index, 1);
      }
    });
    setProjectProperty(newProjectProperty);
  };

  const switchOrder = (before, after) => (event) => {
    const newProjectProperty = structuredClone(projectProperty);
    newProjectProperty.templates.forEach((template) => {
      if (template.id === templateId) {
        [template.fields[before], template.fields[after]] = [
          template.fields[after],
          template.fields[before],
        ];
      }
    });
    setProjectProperty(newProjectProperty);
  };

  const changeFieldType = (id) => (event) => {
    const newProjectProperty = structuredClone(projectProperty);
    newProjectProperty.templates.forEach((template) => {
      if (template.id === templateId) {
        template.fields.forEach((field) => {
          if (field.id === id) {
            field.type = event.target.value;
          }
        });
      }
    });
    setProjectProperty(newProjectProperty);
  };

  const changeFieldLabel = (id) => (event) => {
    const newProjectProperty = structuredClone(projectProperty);
    newProjectProperty.templates.forEach((template) => {
      if (template.id === templateId) {
        template.fields.forEach((field) => {
          if (field.id === id) {
            field.label = event.target.value;
          }
        });
      }
    });
    setProjectProperty(newProjectProperty);
  };

  const changeFieldDescription = (id) => (event) => {
    const newProjectProperty = structuredClone(projectProperty);
    newProjectProperty.templates.forEach((template) => {
      if (template.id === templateId) {
        template.fields.forEach((field) => {
          if (field.id === id) {
            field.description = event.target.value;
          }
        });
      }
    });
    setProjectProperty(newProjectProperty);
  };

  const selectStyles = {
    minWidth: 100,
    ".MuiInputBase-root": {
      height: 25,
      fontSize: 12,
      fontWeight: 100,
    },
    ".MuiSelect-select": { padding: "2px 20px 2px 5.5px !important" },
    ".MuiSvgIcon-root": { right: 1 },
  };

  const menuItemStyles = {
    fontSize: 12,
    maxHeight: 25,
    minHeight: 25,
    padding: "2px 20px 2px 5.5px !important",
  };

  const template = getTemplate();

  return (
    <>
      <Box padding="space.050">
        <Inline alignBlock="center" alignInline="end">
          <IconButton
            icon={EditorAddIcon}
            appearance="subtle"
            spacing="compact"
            onClick={addField}
          ></IconButton>
        </Inline>
      </Box>
      <Box>
        {template.fields.map((field, index) => {
          return (
            <Box padding="space.050">
              <Inline alignBlock="center" spread="space-between">
                <Inline alignInline="start">
                  <Stack>
                    <Text size="small">Type</Text>
                    <FormControl sx={selectStyles} size="small">
                      <Select
                        value={field.type}
                        onChange={changeFieldType(field.id)}
                      >
                        <MenuItem value={FIELD_TYPE.CHECK} sx={menuItemStyles}>
                          CHECK ITEM
                        </MenuItem>
                        <MenuItem
                          value={FIELD_TYPE.SEPARATOR}
                          sx={menuItemStyles}
                        >
                          SEPARATOR
                        </MenuItem>
                      </Select>
                    </FormControl>
                  </Stack>
                  <Stack>
                    <Text size="small">Label</Text>
                    <TextField
                      value={field.label}
                      onChange={changeFieldLabel(field.id)}
                      fullWidth
                      sx={textFieldStyles}
                    />
                  </Stack>
                  <Stack>
                    <Text size="small">Description</Text>
                    <TextField
                      value={field.description}
                      onChange={changeFieldDescription(field.id)}
                      fullWidth
                      sx={textFieldStyles}
                    />
                  </Stack>
                </Inline>
                <Inline alignInline="end">
                  <IconButton
                    icon={ArrowDownIcon}
                    appearance="subtle"
                    spacing="compact"
                    isDisabled={index === template.fields.length - 1}
                    onClick={switchOrder(index, index + 1)}
                  ></IconButton>
                  <IconButton
                    icon={ArrowUpIcon}
                    appearance="subtle"
                    spacing="compact"
                    isDisabled={index === 0}
                    onClick={switchOrder(index, index - 1)}
                  ></IconButton>
                  <IconButton
                    icon={TrashIcon}
                    appearance="subtle"
                    spacing="compact"
                    onClick={removeField(index)}
                  ></IconButton>
                </Inline>
              </Inline>
            </Box>
          );
        })}{" "}
      </Box>
    </>
  );
};

export default App;

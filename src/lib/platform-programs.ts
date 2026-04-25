type ProgramTitleRow = {
  id: string;
  title: string;
};

type ProgramModuleOptionRow = {
  id: string;
  program_id: string;
  title: string;
  position: number;
};

export function buildProgramTitleMap<TProgram extends ProgramTitleRow>(programs: TProgram[]) {
  return new Map(programs.map((program) => [program.id, program.title]));
}

export function getProgramModuleLabel(
  module: Pick<ProgramModuleOptionRow, "program_id" | "position" | "title">,
  programTitleById: Map<string, string>
) {
  return `${programTitleById.get(module.program_id) ?? "Parcours"} · Module ${module.position + 1} · ${module.title}`;
}

export function buildProgramModuleOptions<
  TProgram extends ProgramTitleRow,
  TModule extends ProgramModuleOptionRow
>(programs: TProgram[], modules: TModule[]) {
  const programTitleById = buildProgramTitleMap(programs);

  return modules
    .slice()
    .sort((left, right) =>
      left.program_id === right.program_id
        ? left.position - right.position
        : (programTitleById.get(left.program_id) ?? "").localeCompare(programTitleById.get(right.program_id) ?? "")
    )
    .map((module) => ({
      id: module.id,
      label: getProgramModuleLabel(module, programTitleById)
    }));
}

export function groupProgramModulesByProgramId<TModule extends Pick<ProgramModuleOptionRow, "program_id" | "position">>(
  modules: TModule[]
) {
  const moduleListByProgramId = modules.reduce((map, module) => {
    const current = map.get(module.program_id) ?? [];
    current.push(module);
    map.set(module.program_id, current);
    return map;
  }, new Map<string, TModule[]>());

  for (const programModules of moduleListByProgramId.values()) {
    programModules.sort((left, right) => left.position - right.position);
  }

  return moduleListByProgramId;
}

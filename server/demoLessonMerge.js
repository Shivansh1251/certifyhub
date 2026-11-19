function mergeDemoModules(existingModules, demoModules) {
  for (const demoModule of demoModules || []) {
    const existingModule = existingModules.find((module) => module.title === demoModule.title);
    if (!existingModule) {
      existingModules.push(demoModule);
      continue;
    }

    for (const demoLesson of demoModule.lessons || []) {
      const existingLesson = existingModule.lessons.find((lesson) => lesson.title === demoLesson.title);
      if (!existingLesson) {
        existingModule.lessons.push(demoLesson);
        continue;
      }

      const isUntouchedStarter = demoLesson._starterContent
        && existingLesson.content === demoLesson._starterContent
        && !(existingLesson.contentSections || []).length
        && !(existingLesson.selfChecks || []).length;
      const sameSeedSections = (existingLesson.contentSections || []).length === (demoLesson.contentSections || []).length
        && (existingLesson.contentSections || []).every((section, index) =>
          section.type === demoLesson.contentSections[index].type
          && section.heading === demoLesson.contentSections[index].heading
          && section.body === demoLesson.contentSections[index].body);
      const sameSeedChecks = (existingLesson.selfChecks || []).length === (demoLesson.selfChecks || []).length
        && (existingLesson.selfChecks || []).every((check, index) =>
          check.question === demoLesson.selfChecks[index].question
          && check.answer === demoLesson.selfChecks[index].answer);
      const isUntouchedEnrichedSeed = existingLesson.content === demoLesson.content && sameSeedSections && sameSeedChecks;

      if (isUntouchedStarter) {
        existingLesson.content = demoLesson.content;
        existingLesson.contentSections = demoLesson.contentSections;
        existingLesson.selfChecks = demoLesson.selfChecks;
        if (!existingLesson.summary) existingLesson.summary = demoLesson.summary;
        if (!existingLesson.duration) existingLesson.duration = demoLesson.duration;
        if (!(existingLesson.objectives || []).length) existingLesson.objectives = demoLesson.objectives;
      }

      if (isUntouchedStarter || isUntouchedEnrichedSeed) {
        if (!existingLesson.imageUrl) existingLesson.imageUrl = demoLesson.imageUrl;
        if (!existingLesson.imageAlt) existingLesson.imageAlt = demoLesson.imageAlt;
        if (!existingLesson.imageCaption) existingLesson.imageCaption = demoLesson.imageCaption;
        if (!(existingLesson.games || []).length) existingLesson.games = demoLesson.games;
      }
    }
  }

  return existingModules;
}

module.exports = mergeDemoModules;

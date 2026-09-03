import { ComponentType } from '@cyclonedx/cyclonedx-library/Enums';
import {
  Bom,
  Component,
  SpdxLicense,
} from '@cyclonedx/cyclonedx-library/Models';
import {
  JsonSerializer,
  JSON as CycloneDxJson,
} from '@cyclonedx/cyclonedx-library/Serialize';
import {
  Spec1dot6,
  Version as CycloneDxVersion,
} from '@cyclonedx/cyclonedx-library/Spec';
import { JsonStrictValidator } from '@cyclonedx/cyclonedx-library/Validation';

import type { ReleaseVersion } from './contract.js';

export type PackagedDependency = {
  type: 'framework' | 'library';
  name: 'electron' | 'zod';
  version: string;
  license: string;
};

function componentType(type: PackagedDependency['type']): ComponentType {
  return type === 'framework' ? ComponentType.Framework : ComponentType.Library;
}

function packageRef(name: string, version: string): string {
  return `pkg:generic/${name}@${version}`;
}

export async function createDesktopSbom(
  version: ReleaseVersion,
  dependencies: readonly PackagedDependency[],
): Promise<string> {
  const bom = new Bom();
  const root = new Component(
    ComponentType.Application,
    'csf-self-assessment-desktop',
    {
      version,
      bomRef: packageRef('csf-self-assessment-desktop', version),
    },
  );
  const author = new Component(ComponentType.Application, 'csf-author', {
    version,
    bomRef: packageRef('csf-author', version),
  });
  const assessment = new Component(ComponentType.Application, 'csf-assessment', {
    version,
    bomRef: packageRef('csf-assessment', version),
  });

  bom.metadata.component = root;
  bom.components.add(author);
  bom.components.add(assessment);
  root.dependencies.add(author.bomRef);
  root.dependencies.add(assessment.bomRef);

  for (const dependency of dependencies) {
    const component = new Component(
      componentType(dependency.type),
      dependency.name,
      {
        version: dependency.version,
        bomRef: packageRef(dependency.name, dependency.version),
      },
    );
    component.licenses.add(new SpdxLicense(dependency.license));
    bom.components.add(component);
    author.dependencies.add(component.bomRef);
    assessment.dependencies.add(component.bomRef);
  }

  const serializer = new JsonSerializer(
    new CycloneDxJson.Normalize.Factory(Spec1dot6),
  );
  const document = serializer.serialize(bom);
  await validateDesktopSbom(document);
  return document;
}

export async function validateDesktopSbom(document: string): Promise<void> {
  const validator = new JsonStrictValidator(CycloneDxVersion.v1dot6);
  const error = await validator.validate(document);
  if (error !== null) {
    throw new Error(`Invalid CycloneDX SBOM: ${error.message}`);
  }
}

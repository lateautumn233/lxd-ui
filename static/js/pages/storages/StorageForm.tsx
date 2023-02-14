import React, { FC, useState } from "react";
import { Col, Form, Input, Row, Select } from "@canonical/react-components";
import { useFormik } from "formik";
import * as Yup from "yup";
import Aside from "components/Aside";
import NotificationRow from "components/NotificationRow";
import PanelHeader from "components/PanelHeader";
import useNotification from "util/useNotification";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "util/queryKeys";
import SubmitButton from "components/SubmitButton";
import { checkDuplicateName } from "util/helpers";
import usePanelParams from "util/usePanelParams";
import { LxdStorage } from "types/storage";
import { createStoragePool } from "api/storages";
import { getSourceHelpForDriver, storageDrivers } from "util/storageOptions";

const StorageForm: FC = () => {
  const panelParams = usePanelParams();
  const notify = useNotification();
  const queryClient = useQueryClient();
  const controllerState = useState<AbortController | null>(null);

  const SnapshotSchema = Yup.object().shape({
    name: Yup.string()
      .test(
        "deduplicate",
        "A storage pool with this name already exists",
        (value) =>
          checkDuplicateName(
            value,
            panelParams.project,
            controllerState,
            "storage-pools"
          )
      )
      .required("This field is required"),
  });

  const formik = useFormik({
    initialValues: {
      name: "",
      description: "",
      driver: "zfs",
      source: "",
      size: "",
    },
    validationSchema: SnapshotSchema,
    onSubmit: ({ name, description, driver, source, size }) => {
      const storagePool: LxdStorage = {
        name,
        description,
        driver,
        source: driver !== "btrfs" ? source : undefined,
        config: {
          size: size ? `${size}GiB` : undefined,
        },
      };

      createStoragePool(storagePool, panelParams.project)
        .then(() => {
          void queryClient.invalidateQueries({
            queryKey: [queryKeys.storage],
          });
          panelParams.clear();
        })
        .catch((e) => {
          formik.setSubmitting(false);
          notify.failure("Error on storage pool creation.", e);
        });
    },
  });

  return (
    <Aside>
      <div className="p-panel">
        <PanelHeader title={<h4>Create storage pool</h4>} />
        <div className="p-panel__content">
          <NotificationRow notify={notify} />
          <Row>
            <Form onSubmit={formik.handleSubmit} stacked>
              <Input
                id="name"
                name="name"
                type="text"
                label="Name"
                onBlur={formik.handleBlur}
                onChange={formik.handleChange}
                value={formik.values.name}
                error={formik.touched.name ? formik.errors.name : null}
                required
                stacked
              />
              <Input
                id="description"
                name="description"
                type="text"
                label="Description"
                onBlur={formik.handleBlur}
                onChange={formik.handleChange}
                value={formik.values.description}
                error={
                  formik.touched.description ? formik.errors.description : null
                }
                stacked
              />
              <Select
                name="driver"
                help="ZFS gives best performance and reliability"
                label="Driver"
                options={storageDrivers}
                onChange={formik.handleChange}
                value={formik.values.driver}
                required
                stacked
              />
              <Input
                id="size"
                name="size"
                type="number"
                help="Optional, defaults to 20% of free disk space, >= 5 GiB and <= 30 GiB"
                label="Size in GiB"
                onBlur={formik.handleBlur}
                onChange={formik.handleChange}
                value={formik.values.size}
                error={formik.touched.size ? formik.errors.size : null}
                stacked
              />
              <Input
                id="source"
                name="source"
                type="text"
                disabled={formik.values.driver === "btrfs"}
                help={getSourceHelpForDriver(formik.values.driver)}
                label="Source"
                onBlur={formik.handleBlur}
                onChange={formik.handleChange}
                value={formik.values.source}
                error={formik.touched.source ? formik.errors.source : null}
                stacked
              />
              <hr />
              <Row className="u-align--right">
                <Col size={12}>
                  <SubmitButton
                    isSubmitting={formik.isSubmitting}
                    isDisabled={!formik.isValid}
                    buttonLabel="Create"
                  />
                </Col>
              </Row>
            </Form>
          </Row>
        </div>
      </div>
    </Aside>
  );
};

export default StorageForm;

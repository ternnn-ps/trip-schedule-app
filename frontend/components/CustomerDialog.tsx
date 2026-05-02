"use client";

import { CustomerService } from "@/services/CustomerService";
import { Customer } from "@/types/customer";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useState } from "react";

const service = new CustomerService();

type CustomerDialogProps = {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  data: Customer | null;
};

type CustomerErrors = Partial<Record<keyof Customer, string>>;

const emptyForm: Customer = {
  customerCode: "",
  customerName: "",
  address: "",
  telNo: "",
};

export default function CustomerDialog({
  open,
  onClose,
  onSuccess,
  data,
}: CustomerDialogProps) {
  const [form, setForm] = useState<Customer>(emptyForm);
  const [errors, setErrors] = useState<CustomerErrors>({});
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    if (!open) {
      return;
    }

    setForm(
      data
        ? {
            customerId: data.customerId,
            customerCode: data.customerCode ?? "",
            customerName: data.customerName ?? "",
            address: data.address ?? "",
            telNo: data.telNo ?? "",
          }
        : emptyForm
    );
    setErrors({});
    setSubmitError("");
  }, [data, open]);

  const updateField = (field: keyof Customer, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: "" }));
    setSubmitError("");
  };

  const validate = () => {
    const nextErrors: CustomerErrors = {};

    if (!form.customerCode.trim()) {
      nextErrors.customerCode = "Customer code is required.";
    }

    if (!form.customerName.trim()) {
      nextErrors.customerName = "Customer name is required.";
    }

    if (!form.telNo.trim()) {
      nextErrors.telNo = "Telephone number is required.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      return;
    }

    try {
      setSaving(true);
      setSubmitError("");

      const payload: Customer = {
        ...form,
        customerCode: form.customerCode.trim(),
        customerName: form.customerName.trim(),
        address: form.address.trim(),
        telNo: form.telNo.trim(),
      };

      const response = payload.customerId
        ? await service.update(payload)
        : await service.create(payload);

      if (!response?.result) {
        setSubmitError(response?.msgDetail || "The server could not save this customer.");
        return;
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error("Save error:", error);
      setSubmitError("The request failed. Please check the API and try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ pb: 0.5, fontWeight: 700 }}>
        {form.customerId ? "Edit customer" : "Create customer"}
      </DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        <Stack spacing={2.25} sx={{ mt: 1 }}>
          <Typography color="text.secondary">
            Capture the essentials so customer records stay consistent and easy to find.
          </Typography>

          {submitError ? <Alert severity="error">{submitError}</Alert> : null}

          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField
              label="Customer code"
              value={form.customerCode}
              error={Boolean(errors.customerCode)}
              helperText={errors.customerCode || "Required"}
              onChange={(event) => updateField("customerCode", event.target.value)}
              fullWidth
            />

            <TextField
              label="Telephone"
              value={form.telNo}
              error={Boolean(errors.telNo)}
              helperText={errors.telNo || "Required"}
              onChange={(event) => updateField("telNo", event.target.value)}
              fullWidth
            />
          </Stack>

          <TextField
            label="Customer name"
            value={form.customerName}
            error={Boolean(errors.customerName)}
            helperText={errors.customerName || "Required"}
            onChange={(event) => updateField("customerName", event.target.value)}
            fullWidth
          />

          <TextField
            label="Address"
            value={form.address}
            onChange={(event) => updateField("address", event.target.value)}
            multiline
            minRows={3}
            helperText="Optional"
            fullWidth
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button variant="contained" onClick={handleSubmit} disabled={saving}>
          {saving ? "Saving..." : form.customerId ? "Save changes" : "Create customer"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

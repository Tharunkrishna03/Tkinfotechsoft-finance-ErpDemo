import re
from datetime import date
from decimal import Decimal
from django.db import models, transaction
from django.core.exceptions import ValidationError
from django.core.validators import RegexValidator

def validate_sequence_format(value):
    if not value or '{number}' not in value:
        raise ValidationError("Format must include {number}.")

def render_sequence_value(format_string, number):
    # Support simple {number} and padded {number:04}
    match = re.search(r"\{number(?::(\d+))?\}", format_string)
    if not match:
        return format_string
    padding = int(match.group(1)) if match.group(1) else 0
    rendered_number = str(number).zfill(padding)
    return re.sub(r"\{number(?::\d+)?\}", rendered_number, format_string)

class WorkspaceSettings(models.Model):
    sno_format = models.CharField(max_length=80, default="SNO-{number:04}", validators=[validate_sequence_format])
    ano_format = models.CharField(max_length=80, default="ANO-{number:04}", validators=[validate_sequence_format])
    next_sno_number = models.PositiveIntegerField(default=1)
    next_ano_number = models.PositiveIntegerField(default=1)
    updated_at = models.DateTimeField(auto_now=True)

    @classmethod
    def get_solo(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj

class Customer(models.Model):
    sno = models.CharField(max_length=80, unique=True, blank=True, null=True)
    sno_sequence = models.PositiveIntegerField(default=0)
    ano = models.CharField(max_length=80, unique=True, blank=True, null=True)
    ano_sequence = models.PositiveIntegerField(default=0)
    full_name = models.CharField(max_length=150)
    father_or_husband_name = models.CharField(max_length=150, blank=True, default="")
    date_of_birth = models.DateField(blank=True, null=True)
    age = models.PositiveSmallIntegerField(blank=True, null=True)
    mobile_number = models.CharField(max_length=10, blank=True, default="")
    address = models.TextField(blank=True, default="")
    occupation = models.CharField(max_length=120, blank=True, default="")
    identity_proof_type = models.CharField(max_length=50, blank=True, default="")
    identity_proof_name = models.CharField(max_length=150, blank=True, default="")
    identity_proof_number = models.CharField(max_length=50, blank=True, default="")
    identity_proof_file = models.FileField(upload_to="customers/identity/", blank=True, null=True)
    address_proof_type = models.CharField(max_length=50, blank=True, default="")
    address_proof_file = models.FileField(upload_to="customers/address/", blank=True, null=True)
    photo = models.FileField(upload_to="customers/photos/", blank=True, null=True)
    item_type = models.CharField(max_length=50, blank=True, default="")
    metal_type = models.CharField(max_length=50, blank=True, default="")
    purity_or_karat = models.CharField(max_length=30, blank=True, default="")
    weight_grams = models.DecimalField(max_digits=10, decimal_places=3, blank=True, null=True)
    number_of_stones = models.PositiveIntegerField(blank=True, null=True)
    gemstone_type = models.CharField(max_length=60, blank=True, default="")
    gemstone_carat_or_quantity = models.CharField(max_length=60, blank=True, default="")
    hallmark_or_makers_mark = models.CharField(max_length=120, blank=True, default="")
    remarks = models.TextField(blank=True, default="")
    item_condition = models.CharField(max_length=50, blank=True, default="")
    jewelry_photo = models.FileField(upload_to="customers/jewelry/", blank=True, null=True)
    jewel_entries = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def save(self, *args, **kwargs):
        if not self.sno or not self.ano:
            with transaction.atomic():
                settings = WorkspaceSettings.get_solo()
                if not self.sno:
                    self.sno_sequence = settings.next_sno_number
                    self.sno = render_sequence_value(settings.sno_format, settings.next_sno_number)
                    settings.next_sno_number += 1
                if not self.ano:
                    self.ano_sequence = settings.next_ano_number
                    self.ano = render_sequence_value(settings.ano_format, settings.next_ano_number)
                    settings.next_ano_number += 1
                settings.save()
        super().save(*args, **kwargs)

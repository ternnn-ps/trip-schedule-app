package com.app.test.utils.deserializer;

import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.databind.DeserializationContext;
import com.fasterxml.jackson.databind.deser.std.StdDeserializer;
import org.apache.commons.lang3.StringUtils;

import java.io.IOException;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Arrays;
import java.util.Date;

public class CustomDateDeserializer extends StdDeserializer<Date> {
    public CustomDateDeserializer() {
        this(null);
    }

    public CustomDateDeserializer(Class<?> vc) {
        super(vc);
    }

    @Override
    public Date deserialize(JsonParser jsonparser, DeserializationContext context)
            throws IOException {
        String dateStr = jsonparser.getText();
        try {
            if (StringUtils.isNotBlank(dateStr)) {
                int[] arr = Arrays.stream(dateStr.split("/")).mapToInt(s -> Integer.parseInt(s)).toArray();
                LocalDate localDate = LocalDate.of(arr[2], arr[1], arr[0]);
                Instant instant = localDate.atStartOfDay().atZone(ZoneId.systemDefault()).toInstant();
                return Date.from(instant);
            } else {
                return null;
            }
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }
}
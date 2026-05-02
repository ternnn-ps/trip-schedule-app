package com.app.test.utils.deserializer;

import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.databind.DeserializationContext;
import com.fasterxml.jackson.databind.deser.std.StdDeserializer;
import org.apache.commons.lang3.StringUtils;

import java.io.IOException;
import java.text.SimpleDateFormat;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Arrays;
import java.util.Date;

public class CustomDateTimeDeserializer extends StdDeserializer<Date> {

    private SimpleDateFormat formatter =
            new SimpleDateFormat("dd/MM/yyyy HH:mm");

    public CustomDateTimeDeserializer() {
        this(null);
    }

    public CustomDateTimeDeserializer(Class<?> vc) {
        super(vc);
    }

    @Override
    public Date deserialize(JsonParser jsonparser, DeserializationContext context)
            throws IOException {
        String dateStr = jsonparser.getText();
        try {
            if (StringUtils.isNotBlank(dateStr)) {
                String[] strArr = dateStr.split(" ");
                int[] date = Arrays.stream(strArr[0].split("/")).mapToInt(Integer::parseInt).toArray();
                int[] time = Arrays.stream(strArr[1].split(":")).mapToInt(Integer::parseInt).toArray();

                LocalDateTime localDateTime = LocalDateTime.of(date[2], date[1], date[0], time[0], time[1]);
                Instant instant = localDateTime.atZone(ZoneId.systemDefault()).toInstant();
                return Date.from(instant);
            } else {
                return null;
            }
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }
}
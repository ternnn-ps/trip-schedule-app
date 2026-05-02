package com.app.test.utils.deserializer;

import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.DeserializationContext;
import com.fasterxml.jackson.databind.deser.std.StdDeserializer;
import org.apache.commons.lang3.StringUtils;

import java.io.IOException;
import java.text.SimpleDateFormat;
import java.util.Date;

public class CustomTimeDeserializer extends StdDeserializer<Date> {

    private SimpleDateFormat formatter =
            new SimpleDateFormat("HH:mm");

    public CustomTimeDeserializer() {
        this(null);
    }

    public CustomTimeDeserializer(Class<?> vc) {
        super(vc);
    }

    @Override
    public Date deserialize(JsonParser jsonParser, DeserializationContext deserializationContext) throws IOException, JsonProcessingException {
        String dateStr = jsonParser.getText();
        try {
            if (StringUtils.isNotBlank(dateStr)) {
                return formatter.parse(dateStr);
            }
            return null;
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }
}

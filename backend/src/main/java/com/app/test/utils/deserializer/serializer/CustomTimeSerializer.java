package com.app.test.utils.deserializer.serializer;

import com.fasterxml.jackson.core.JsonGenerator;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.SerializerProvider;
import com.fasterxml.jackson.databind.ser.std.StdSerializer;

import java.io.IOException;
import java.text.SimpleDateFormat;
import java.util.Date;

public class CustomTimeSerializer extends StdSerializer<Date> {

    private SimpleDateFormat formatter =
            new SimpleDateFormat("HH:mm");

    public CustomTimeSerializer() {
        this(null);
    }

    public CustomTimeSerializer(Class t) {
        super(t);
    }

    @Override
    public void serialize (Date value, JsonGenerator gen, SerializerProvider provider)
            throws IOException, JsonProcessingException {

        if(value != null) {
            String strDate = formatter.format(value);
            gen.writeString(strDate);
        }
    }

}